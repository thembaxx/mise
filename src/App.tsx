import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown } from '@phosphor-icons/react/dist/csr/ArrowDown';
import { ArrowRight } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { ArrowUpRight } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import { Clock } from '@phosphor-icons/react/dist/csr/Clock';
import { GlobeHemisphereWest } from '@phosphor-icons/react/dist/csr/GlobeHemisphereWest';
import { Heart } from '@phosphor-icons/react/dist/csr/Heart';
import { ClipboardText } from '@phosphor-icons/react/dist/csr/ClipboardText';
import { BookOpen } from '@phosphor-icons/react/dist/csr/BookOpen';
import { List } from '@phosphor-icons/react/dist/csr/List';
import { Cursor } from '@phosphor-icons/react/dist/csr/Cursor';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { Sparkle } from '@phosphor-icons/react/dist/csr/Sparkle';
import { X } from '@phosphor-icons/react/dist/csr/X';
import { usePageMotion, useRecipeReveal } from './motion/usePageMotion';
import { isKeyboardInteraction } from './motion/preferences';
import KitchenGateway from './components/KitchenGateway';
import { useNativeApp, type NativeAppState } from './pwa/useNativeApp';
import { NativeDialog, NativeHeaderActions, NativeNotices } from './components/NativeControls';
import { recipes, regions } from './data/recipes';
import type { Recipe, Region } from './data/recipes';
import { allRecipes, findRecipe, savedRecipeIds, setRecipeSaved } from './lib/personal-cookbook';

type Filter = 'All' | Region;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches || isKeyboardInteraction() ? 'instant' : 'smooth', block: 'start' });
}

function Logo({ light = false }: { light?: boolean }) {
  return <a className={'logo ' + (light ? 'logo-light' : '')} href="#top" aria-label="Mise, back to top" onClick={(e) => { e.preventDefault(); scrollToSection('top'); }}><img src="/brand/mise-mark.svg" width="38" height="38" alt="" aria-hidden="true" /><span className="logo-wordmark">Mise</span></a>;
}

function Header({ favoritesCount, onSaved, app, onSettings }: { favoritesCount: number; onSaved: () => void; app: NativeAppState; onSettings: () => void }) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); menuButton.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  const go = (id: string) => { setOpen(false); scrollToSection(id); };
  return <>
    <header className="site-header">
      <Logo />
      <nav className="desktop-nav" aria-label="Main navigation">
        <button type="button" onClick={() => go('discover')}>Discover</button>
        <a href="/cookbook/">My cookbook</a>
        <button type="button" onClick={() => go('kitchen')}>The kitchen</button>
        <button type="button" onClick={() => go('experience')}>Our philosophy</button>
      </nav>
      <div className="header-actions">
        <a className="shopping-header-link" href="/cookbook/" aria-label="Open personal cookbook" title="My cookbook"><BookOpen size={19}/></a>
        <a className="shopping-header-link" href="/shopping/" aria-label="Open shopping list" title="Shopping list"><ClipboardText size={19}/></a>
        <NativeHeaderActions app={app} onSettings={onSettings} />
        <button type="button" className="saved-nav" onClick={() => { onSaved(); go('discover'); }} aria-label={'Show saved recipes, ' + favoritesCount + ' saved'}><Heart size={17} /><span>{favoritesCount}</span></button>
        <button type="button" className="nav-cta" onClick={() => go('kitchen')}>Start cooking <ArrowUpRight size={17} /></button>
        <button type="button" ref={menuButton} className="mobile-menu-button" aria-controls="mobile-navigation" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open}>{open ? <X size={23} /> : <List size={23} />}</button>
      </div>
    </header>
    <div id="mobile-navigation" className="mobile-menu" hidden={!open} inert={!open}>
      <button type="button" onClick={() => go('discover')}>Discover recipes <ArrowUpRight /></button>
      <a href="/cookbook/" className="mobile-cookbook-link">My cookbook <BookOpen size={18}/></a>
      <a href="/shopping/" className="mobile-cookbook-link">Shopping list <ClipboardText size={18}/></a>
      <button type="button" onClick={() => go('kitchen')}>The kitchen <ArrowUpRight /></button>
      <button type="button" onClick={() => go('experience')}>Our philosophy <ArrowUpRight /></button>
    </div>
  </>;
}

function Hero() {
  return <section className="hero" aria-labelledby="hero-title">
    <div className="hero-copy">
      <p className="hero-overline"><span className="hero-overline-mark" /> A NEW WAY TO EXPERIENCE FOOD</p>
      <h1 id="hero-title">The world,<br /><em>on your table.</em></h1>
      <p className="hero-description">Curious about what the world is cooking? Discover extraordinary recipes, get a little messy, and make every meal a story worth sharing.</p>
      <div className="hero-buttons">
        <button type="button" className="button-dark" onClick={() => scrollToSection('kitchen')}>Step into the kitchen <span><ArrowUpRight size={19} /></span></button>
        <button type="button" className="button-text" onClick={() => scrollToSection('discover')}>Explore recipes <ArrowRight size={19} /></button>
      </div>
      <div className="hero-bottom"><span className="hero-bottom-line" /><span>GOOD FOOD. GOOD STORIES. GOOD COMPANY.</span></div>
    </div>
    <div className="hero-visual">
      <div className="hero-image-wrap">
        <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1600&q=90" alt="Beautifully plated colorful food with fresh vegetables" fetchPriority="high" onError={event => { if (!event.currentTarget.src.includes('mise-social.svg')) event.currentTarget.src = '/brand/mise-social.svg'; }} />
        <div className="hero-image-wash" />
      </div>
      <div className="hero-photo-caption"><span>MADE TO BE SHARED</span><span>01 — ∞</span></div>
      <div className="hero-float-card">
        <div className="float-card-icon"><Sparkle size={19} /></div>
        <span>TODAY'S LITTLE REMINDER</span>
        <strong>Life's too short<br />for boring food.</strong>
        <div className="float-card-footer"><span>With love, Mise</span><ArrowUpRight size={18} /></div>
      </div>
      <div className="hero-orbit"><span>GOOD TASTE IS A JOURNEY · </span></div>
    </div>
  </section>;
}

function Marquee() {
  const items = ['TOKYO', 'NAPLES', 'JOHANNESBURG', 'MEXICO CITY', 'MARRAKECH', 'BANGKOK', 'ATHENS'];
  return <div className="marquee-strip" aria-label="Inspired by kitchens around the world"><div className="marquee-track" aria-hidden="true">{[...items, ...items].map((item, index) => <span key={index}>{item}<span className="marquee-flower" /></span>)}</div></div>;
}

function RecipeCard({ recipe, selected, saved, onSelect, onSave }: {
  recipe: Recipe; selected: boolean; saved: boolean; onSelect: () => void; onSave: () => void;
}) {
  return <article className={'recipe-card ' + (selected ? 'recipe-selected' : '')}>
    <div className="recipe-image">
      <img src={recipe.image} alt={recipe.name + ' — ' + recipe.country + ' inspired dish'} loading="lazy" onError={event => { if (!event.currentTarget.src.includes('mise-social.svg')) event.currentTarget.src = '/brand/mise-social.svg'; }} />
      <div className="recipe-image-top"><span>{recipe.country}</span><button type="button" className={'save-button ' + (saved ? 'saved' : '')} onClick={onSave} aria-label={(saved ? 'Remove ' : 'Save ') + recipe.name + (saved ? ' from saved recipes' : ' to saved recipes')} aria-pressed={saved}><Heart size={17} weight={saved ? 'fill' : 'regular'} /></button></div>
      <button type="button" className="recipe-image-action" onClick={onSelect} aria-label={'Cook ' + recipe.name}><ArrowUpRight size={22} /></button>
    </div>
    <div className="recipe-details">
      <div className="recipe-meta"><span>{recipe.region}</span><span className="meta-divider" /><span>{recipe.difficulty}</span></div>
      <button type="button" className="recipe-name" onClick={onSelect}>{recipe.name}</button>
      <div className="recipe-bottom"><span>{recipe.subtitle}</span><span><Clock size={14} /> {recipe.minutes} min</span></div>
      <a className="recipe-view-link" href={'/recipes/' + encodeURIComponent(recipe.id) + '/'} aria-label={'View full recipe for ' + recipe.name}>View recipe and ingredients <ArrowUpRight size={16}/></a>
    </div>
  </article>;
}

function Discover({ catalog, selectedId, onSelect, saved, onToggleSave, savedOnly, setSavedOnly }: {
   catalog: Recipe[];
  selectedId: string; onSelect: (id: string) => void; saved: string[]; onToggleSave: (id: string) => void;
  savedOnly: boolean; setSavedOnly: (value: boolean) => void;
}) {
  const resultsRoot = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => catalog.filter(recipe =>
    (filter === 'All' || recipe.region === filter) &&
    (!savedOnly || saved.includes(recipe.id)) &&
    (recipe.name + ' ' + recipe.country + ' ' + recipe.region + ' ' + recipe.tags.join(' ') + ' ' + recipe.story).toLowerCase().includes(search.trim().toLowerCase())
  ), [catalog, filter, search, saved, savedOnly]);

  useRecipeReveal(resultsRoot, filtered.map(recipe => recipe.id).join(','));

  return <section className="discover-section" id="discover">
    <div className="discover-layout">
      <div className="discover-intro" id="discover-intro">
        <p className="eyebrow"><span className="eyebrow-dot" /> THE DISCOVERY TABLE</p>
        <h2>Where to<br /><em>today?</em></h2>
        <p>From street food to Sunday feasts. Find something that speaks to your appetite, then make it your own.</p>
        <div className="search-wrap"><MagnifyingGlass size={19} /><label htmlFor="recipe-search" className="visually-hidden">Search recipes or countries</label><input id="recipe-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search a dish, a place..." type="search" /></div>
        <div className="filter-list" role="group" aria-label="Filter recipes by region">
          {regions.map(region => <button key={region} type="button" className={filter === region ? 'filter-active' : ''} onClick={() => setFilter(region)} aria-pressed={filter === region}><span>{region}</span><ArrowUpRight size={15} /></button>)}
        </div>
        <button type="button" className={'saved-filter ' + (savedOnly ? 'is-active' : '')} onClick={() => setSavedOnly(!savedOnly)} aria-pressed={savedOnly}><Heart size={17} weight={savedOnly ? 'fill' : 'regular'} /> {savedOnly ? 'Showing saved recipes' : 'Only show my saved recipes'} <span>{saved.length}</span></button>
      </div>
      <div className="recipes-content" ref={resultsRoot}>
        <div className="recipes-topline"><span>THE MENU</span><span>{String(filtered.length).padStart(2, '0')} DISHES TO DISCOVER</span></div>
        {filtered.length ? <div className="recipe-grid">
          {filtered.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} selected={selectedId === recipe.id} saved={saved.includes(recipe.id)} onSelect={() => { onSelect(recipe.id); scrollToSection('kitchen'); }} onSave={() => onToggleSave(recipe.id)} />)}
        </div> : <div className="empty-recipes"><MagnifyingGlass size={29} /><h3>No dishes on this table.</h3><p>Try another region or search term. There's always something good to cook.</p><button type="button" onClick={() => { setSearch(''); setFilter('All'); setSavedOnly(false); }}>Show all recipes <ArrowRight size={17} /></button></div>}
        <div className="recipes-end"><span>MORE STORIES ARE ALWAYS COOKING</span><span>SCROLL TO THE KITCHEN <ArrowDown size={16} /></span></div>
      </div>
    </div>
  </section>;
}

function Experience() {
  return <section className="experience-section" id="experience">
    <div className="experience-heading">
      <p className="eyebrow"><span className="eyebrow-dot" /> NOT YOUR ORDINARY COOKBOOK</p>
      <h2>More than a recipe.<br /><em>It's a feeling.</em></h2>
      <p>Because cooking is not just about following instructions. It's about the joy of figuring things out, getting your hands involved, and tasting somewhere new.</p>
    </div>
    <div className="feature-grid">
      <div className="feature-card feature-photo">
        <img src="https://images.unsplash.com/photo-1556911220-bff31c812dba?w=1200&q=85" alt="A welcoming kitchen filled with ingredients" loading="lazy" />
        <div className="feature-photo-overlay"><span>FOR THE CURIOUS COOK</span><h3>Make a little<br /><em>magic.</em></h3><span className="feature-round"><ArrowUpRight size={20} /></span></div>
      </div>
      <div className="feature-card feature-3d">
        <div className="feature-3d-art"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-tomato"><span /></div><div className="art-leaf" /></div>
        <span className="feature-kicker">FEEL EVERY INGREDIENT</span><h3>Go ahead.<br />Play with your food.</h3><p>Reach into a tactile 3D kitchen. Pick things up, move them around, and cook your way.</p>
      </div>
      <div className="feature-card feature-time">
        <div className="feature-icon"><Clock size={25} /></div>
        <div className="feature-timer-graphic"><span>00</span><i>:</i><span>35</span></div>
        <h3>Your time.<br />Your pace.</h3><p>Step-by-step guidance and a timer that stays right beside you.</p>
      </div>
      <div className="feature-card feature-world">
        <div className="feature-icon"><GlobeHemisphereWest size={25} /></div>
        <div className="world-lines"><span>JAPAN</span><span>ITALY</span><span>SOUTH AFRICA</span><span>MEXICO</span></div>
        <h3>One world.<br />Infinite flavor.</h3><p>Recipes inspired by kitchens and cultures across the globe.</p>
      </div>
      <div className="feature-card feature-love">
        <div className="feature-icon"><Heart size={25} /></div>
        <div className="love-graphic"><Heart size={96} weight="fill" /></div>
        <h3>Keep what<br />you love.</h3><p>Save your favorites. Come back whenever inspiration strikes.</p>
      </div>
    </div>
  </section>;
}

function Footer() {
  return <footer className="footer">
    <div className="footer-main">
      <p className="eyebrow"><span className="eyebrow-dot" /> PULL UP A CHAIR</p>
      <h2>Something good<br />is <em>cooking.</em></h2>
      <button type="button" className="footer-button" onClick={() => scrollToSection('kitchen')}>Let's make something <span><ArrowUpRight size={22} /></span></button>
    </div>
    <div className="footer-bottom"><Logo light /><p>Made for the curious, the hungry, and everyone in between.</p><a href="#top" onClick={(e) => { e.preventDefault(); scrollToSection('top'); }}>Back to top <ArrowUpRight size={16} /></a></div>
  </footer>;
}

export default function App() {
  const root = useRef<HTMLElement>(null);
  usePageMotion(root);
  const native = useNativeApp();
  const [catalog, setCatalog] = useState<Recipe[]>(() => allRecipes());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(() => {
    const id = new URLSearchParams(window.location.search).get('recipe');
    return findRecipe(id)?.id || recipes[0].id;
  });
  const [saved, setSaved] = useState<string[]>(() => savedRecipeIds());
  useEffect(() => {
    const sync = () => { setCatalog(allRecipes()); setSaved(savedRecipeIds()); };
    window.addEventListener('storage',sync);
    window.addEventListener('mise:cookbook:updated',sync);
    return () => {window.removeEventListener('storage',sync); window.removeEventListener('mise:cookbook:updated',sync);};
  },[]);
  const [savedOnly, setSavedOnly] = useState(false);
  const selectedRecipe = catalog.find(recipe => recipe.id === selectedId) || recipes[0];

  const toggleSaved = (id: string) => {
    // Persist outside React's state updater: persistence broadcasts a cookbook event
    // that may synchronously notify mounted components.
    if (setRecipeSaved(id,!saved.includes(id))) setSaved(savedRecipeIds());
  };

  useEffect(() => {
    const destination = new URLSearchParams(window.location.search).get('view');
    if (destination !== 'kitchen' && destination !== 'discover' && destination !== 'cook') return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(destination === 'cook' ? 'kitchen' : destination)?.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return <main id="top" className="site-wrap" ref={root}>
    <Header favoritesCount={saved.length} onSaved={() => setSavedOnly(true)} app={native} onSettings={() => setSettingsOpen(true)} />
    <Hero />
    <Marquee />
    <Discover catalog={catalog} selectedId={selectedId} onSelect={setSelectedId} saved={saved} onToggleSave={toggleSaved} savedOnly={savedOnly} setSavedOnly={setSavedOnly} />
    <KitchenGateway key={selectedRecipe.id} recipe={selectedRecipe} onRecipeChange={setSelectedId} />
    <Experience />
    <Footer />
    <div className="corner-credit" aria-hidden="true"><Cursor size={12} /> MADE TO EXPLORE</div>
    <NativeDialog app={native} open={settingsOpen} close={() => setSettingsOpen(false)} />
    <NativeNotices app={native} />
  </main>;
}
