import {describe,expect,it} from 'vitest';
import handler,{validateImportUrl,isPublicIPv4,RECIPE_IMPORT_HOSTS} from '../api/import-recipe.js';
describe('protected recipe website importer',()=>{
 it('restricts origins to explicitly supported recipe publishers and HTTPS',()=>{
  expect(RECIPE_IMPORT_HOSTS.size).toBeGreaterThan(0);
  expect(validateImportUrl('https://www.budgetbytes.com/test#instructions').href).toBe('https://www.budgetbytes.com/test');
  for(const url of ['http://www.budgetbytes.com/','https://127.0.0.1/','https://localhost/','https://attacker.test/','https://www.budgetbytes.com:8443/','https://user:pass@www.budgetbytes.com/']){
    expect(()=>validateImportUrl(url)).toThrow();
  }
 });
 it('rejects private, loopback, documentation, link-local and IPv6 destination addresses',()=>{
  for(const ip of ['127.0.0.1','10.0.1.3','172.16.2.3','192.168.1.2','169.254.169.254','100.64.1.2','192.0.2.1','203.0.113.2','::1','0.0.0.0','224.0.0.1'])expect(isPublicIPv4(ip)).toBe(false);
  expect(isPublicIPv4('8.8.8.8')).toBe(true);
 });
 it('remains fail-closed until a verified global rate limit is configured',async()=>{
  const response={code:0,headers:{},payload:null,setHeader(k,v){this.headers[k]=v;return this;},status(n){this.code=n;return this;},json(value){this.payload=value;return this;}};
  const prevEnabled=process.env.MISE_IMPORT_PROXY_ENABLED;
  const prevVerified=process.env.MISE_IMPORT_GLOBAL_RATE_LIMIT_VERIFIED;
  try{
    delete process.env.MISE_IMPORT_PROXY_ENABLED;
    delete process.env.MISE_IMPORT_GLOBAL_RATE_LIMIT_VERIFIED;
    await handler({method:'POST',headers:{host:'mise-two-teal.vercel.app',origin:'https://mise-two-teal.vercel.app'},socket:{},body:{url:'https://www.budgetbytes.com/recipe'}},response);
    expect(response.code).toBe(503);
    expect(response.payload.error).toMatch(/paste/i);
    process.env.MISE_IMPORT_PROXY_ENABLED='true';
    const second={...response,code:0,headers:{},payload:null};
    await handler({method:'POST',headers:{host:'mise-two-teal.vercel.app',origin:'https://mise-two-teal.vercel.app'},socket:{},body:{url:'https://www.budgetbytes.com/recipe'}},second);
    expect(second.code).toBe(503);
  }finally{
    if(prevEnabled===undefined)delete process.env.MISE_IMPORT_PROXY_ENABLED;else process.env.MISE_IMPORT_PROXY_ENABLED=prevEnabled;
    if(prevVerified===undefined)delete process.env.MISE_IMPORT_GLOBAL_RATE_LIMIT_VERIFIED;else process.env.MISE_IMPORT_GLOBAL_RATE_LIMIT_VERIFIED=prevVerified;
  }
 });
 it('refuses GET, cross-site origin and malformed requests before any network access',async()=>{
  const response=()=>{
    const obj={code:0,headers:{},payload:null,
      setHeader(k,v){this.headers[k]=v;return this;},
      status(n){this.code=n;return this;},
      json(data){this.payload=data;return this;}};
    return obj;
  };
  let r=response();
  await handler({method:'GET',headers:{},socket:{}},r);
  expect(r.code).toBe(405);
  r=response();
  await handler({method:'POST',headers:{origin:'https://evil.example',host:'mise-two-teal.vercel.app'},socket:{},body:{url:'https://www.budgetbytes.com/'}},r);
  expect(r.code).toBe(403);
  r=response();
  await handler({method:'POST',headers:{host:'mise-two-teal.vercel.app'},socket:{},body:{url:'http://localhost/private'}},r);
  expect(r.code).toBe(422);
 });
});
