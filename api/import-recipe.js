import https from 'node:https';
import dns from 'node:dns/promises';
import net from 'node:net';

// Deliberately narrow. New domains must be reviewed before enabling server-side fetches.
export const RECIPE_IMPORT_HOSTS = new Set([
  'www.budgetbytes.com',
  'www.recipetineats.com',
  'www.bbcgoodfood.com',
  'www.allrecipes.com',
  'www.seriouseats.com',
]);
const MAX_HTML_BYTES=350_000;
const WINDOW_MS=5*60_000;
const perClient=new Map();
const overall=[];
export function isPublicIPv4(address){
  if(net.isIP(address)!==4)return false;
  const [a,b,c]=address.split('.').map(Number);
  if(a===0||a===10||a===127||a>=224||a===169&&b===254||
     a===172&&b>=16&&b<=31||a===192&&(b===168||b===0&&c===0||b===0&&c===2)||
     a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51&&c===100)||
     a===203&&b===0&&c===113||a===192&&b===88&&c===99||
     a===255) return false;
  return true;
}
export function validateImportUrl(value){
  if(typeof value!=='string'||value.length>2048)throw new Error('Enter a supported HTTPS recipe URL.');
  let url;
  try{url=new URL(value);}catch{throw new Error('Enter a valid HTTPS recipe URL.');}
  if(url.protocol!=='https:'||url.port||url.username||url.password||
     !RECIPE_IMPORT_HOSTS.has(url.hostname.toLowerCase())||
     url.href.length>2048)throw new Error('This website is not enabled for protected import. Use Paste recipe instead.');
  url.hash='';
  return url;
}
function rateLimit(req){
  const now=Date.now();
  const supplied=req.headers['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown';
  const ip=String(Array.isArray(supplied)?supplied[0]:supplied).split(',')[0].trim().slice(0,90);
  if(perClient.size>1000)perClient.clear();
  const previous=(perClient.get(ip)||[]).filter(time=>time>now-WINDOW_MS);
  while(overall.length&&overall[0]<=now-WINDOW_MS)overall.shift();
  if(previous.length>=3||overall.length>=25)return false;
  previous.push(now);perClient.set(ip,previous);overall.push(now);
  return true;
}
export async function downloadRecipePage(url){
  const answers=await dns.lookup(url.hostname,{all:true,family:4,verbatim:true});
  if(!answers.length||answers.some(answer=>!isPublicIPv4(answer.address)))
    throw new Error('The source website could not be reached safely.');
  const address=answers[0].address;
  return await new Promise((resolve,reject)=>{
    const request=https.request(url,{
      method:'GET',servername:url.hostname,timeout:7000,signal:AbortSignal.timeout(7500),agent:false,
      // Pin the validated address to prevent DNS rebinding between lookup and connect.
      lookup:(_host,_opts,cb)=>cb(null,address,4),
      headers:{Accept:'text/html, application/ld+json;q=0.9','Accept-Encoding':'identity','User-Agent':'MiseRecipeImport/2.1'},
    },response=>{
      const type=String(response.headers['content-type']||'');
      const declared=Number(response.headers['content-length']||0);
      if(response.statusCode!==200||!/^(text\/html|application\/ld\+json|application\/json)\b/i.test(type)||
         declared>MAX_HTML_BYTES||response.headers['content-encoding']&&response.headers['content-encoding']!=='identity'){
        response.destroy();
        reject(new Error('The source refused an accessible, supported recipe document.'));
        return;
      }
      const chunks=[];let bytes=0;
      response.on('data',chunk=>{
        bytes+=chunk.length;
        if(bytes>MAX_HTML_BYTES){response.destroy();reject(new Error('Recipe page exceeds the 350 KB limit.'));return;}
        chunks.push(chunk);
      });
      response.on('error',reject);
      response.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));
    });
    request.setTimeout(7000,()=>request.destroy(new Error('Recipe website timed out.')));
    request.on('error',reject);
    request.end();
  });
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, private, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'POST required.'});
  }
  const origin=req.headers.origin;
  if(origin){
    try{
      const parsed=new URL(origin);
      if(parsed.protocol!=='https:'||parsed.host!==req.headers.host)return res.status(403).json({error:'Only Mise can initiate imports.'});
    }catch{return res.status(403).json({error:'Invalid origin.'});}
  }
  const encoded=JSON.stringify(req.body||{});
  if(encoded.length>3000||!req.body||typeof req.body!=='object'||Array.isArray(req.body))
    return res.status(400).json({error:'Invalid import request.'});
  let url;
  try{url=validateImportUrl(req.body.url);}
  catch(error){return res.status(422).json({error:error.message});}
  // A per-function Map cannot enforce a global limit across serverless instances.
  // Fail closed until an operator confirms global WAF rules AND explicitly opts in.
  if(process.env.MISE_IMPORT_PROXY_ENABLED!=='true'||process.env.MISE_IMPORT_GLOBAL_RATE_LIMIT_VERIFIED!=='true')
    return res.status(503).json({error:'Protected website importing is unavailable. Paste the recipe text instead.'});
  if(!rateLimit(req)){
    res.setHeader('Retry-After','300');
    return res.status(429).json({error:'Import rate limit reached. Wait a few minutes or paste recipe text.'});
  }
  try{
    const content=await downloadRecipePage(url);
    // Return only raw structured content for explicit client-side review.
    // Never store imported data, follow redirects, render HTML or evaluate scripts.
    return res.status(200).json({content,sourceUrl:url.href});
  }catch{
    return res.status(422).json({error:'This website could not be imported securely. Paste the recipe text instead.'});
  }
}
