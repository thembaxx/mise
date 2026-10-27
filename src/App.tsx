import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { ArrowUpRight } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import { Clock } from '@phosphor-icons/react/dist/csr/Clock';
import { Heart } from '@phosphor-icons/react/dist/csr/Heart';
import { ClipboardText } from '@phosphor-icons/react/dist/csr/ClipboardText';
import { BookOpen } from '@phosphor-icons/react/dist/csr/BookOpen';
import { List } from '@phosphor-icons/react/dist/csr/List';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { X } from '@phosphor-icons/react/dist/csr/X';
import { usePageMotion, useRecipeReveal } from './motion/usePageMotion';
import { isKeyboardInteraction } from './motion/preferences';
import { ActionFeedback, useActionFeedback } from './components/ActionFeedback';
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
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); menuButton.current?.focus(); }
    };
    const onOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target) && !menuButton.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onOutside);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onOutside); };
  }, [open]);
  const go = (id: string) => { setOpen(false); scrollToSection(id); };
  return <>
    <header className="site-header">
      <Logo />
      <nav className="desktop-nav" aria-label="Main navigation">
        <button type="button" onClick={() => go('discover')}>Discover</button>
        <a href="/cookbook/">My cookbook</a>
        <button type="button" onClick={() => go('kitchen')}>The kitchen</button>
      </nav>
      <div className="header-actions">
        <a className="shopping-header-link" href="/shopping/" aria-label="Open shopping list" title="Shopping list"><ClipboardText size={19}/></a>
        <NativeHeaderActions app={app} onSettings={onSettings} />
        <button type="button" className="saved-nav" onClick={() => { onSaved(); go('discover'); }} aria-label={'Show saved recipes, ' + favoritesCount + ' saved'}><Heart size={17} /><span>{favoritesCount}</span></button>
        <button type="button" className="nav-cta" onClick={() => go('kitchen')}>Start cooking <ArrowUpRight size={17} /></button>
        <button type="button" ref={menuButton} className="mobile-menu-button" aria-controls="mobile-navigation" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open}>{open ? <X size={23} /> : <List size={23} />}</button>
      </div>
    </header>
    <div ref={menu} id="mobile-navigation" className="mobile-menu" hidden={!open} inert={!open}>
      <button type="button" onClick={() => go('discover')}>Discover recipes <ArrowUpRight /></button>
      <a href="/cookbook/" className="mobile-cookbook-link">My cookbook <BookOpen size={18}/></a>
      <a href="/shopping/" className="mobile-cookbook-link">Shopping list <ClipboardText size={18}/></a>
      <button type="button" onClick={() => go('kitchen')}>The kitchen <ArrowUpRight /></button>
    </div>
  </>;
}

function Hero() {
  const featured = recipes.find(recipe => recipe.id === 'butter-chicken') || recipes[0];
  return <section className="hero" aria-labelledby="hero-title">
    <div className="hero-copy">
      <p className="hero-overline">A recipe for tonight</p>
      <h1 id="hero-title">The world,<br /><em>on your table.</em></h1>
      <p className="hero-description">Find a dish you want to make. Save it for later, gather your ingredients, and cook one step at a time.</p>
      <div className="hero-buttons">
        <button type="button" className="button-dark" onClick={() => scrollToSection('kitchen')}>Step into the kitchen <span><ArrowUpRight size={19} /></span></button>
        <button type="button" className="button-text" onClick={() => scrollToSection('discover')}>Explore recipes <ArrowRight size={19} /></button>
      </div>
      <a className="hero-cookbook-note" href="/cookbook/"><BookOpen size={17}/> Your recipes, saved on this device <ArrowRight size={15}/></a>
    </div>
    <div className="hero-visual">
      <a className="hero-image-wrap" href={'/recipes/' + featured.id + '/'} aria-label={'View recipe for ' + featured.name}>
        <img src={featured.image} alt={featured.name} fetchPriority="high" onError={event => { if (!event.currentTarget.src.includes('mise-social.svg')) event.currentTarget.src = '/brand/mise-social.svg'; }} />
      </a>
      <a className="hero-recipe-caption" href={'/recipes/' + featured.id + '/'}>
        <span><small>{featured.country} · {featured.minutes} min</small><strong>{featured.name}</strong></span><ArrowUpRight size={25}/>
      </a>
    </div>
  </section>;
}

function RecipeCard({ recipe, selected, saved, onSelect, onSave }: {
  recipe: Recipe; selected: boolean; saved: boolean; onSelect: () => void; onSave: () => void;
}) {
  return <article className={'recipe-card ' + (selected ? 'recipe-selected' : '')}>
    <div className="recipe-image">
      <img src={recipe.image} alt={recipe.name + ' — ' + recipe.country + ' inspired dish'} loading="lazy" onError={event => { if (!event.currentTarget.src.includes('mise-social.svg')) event.currentTarget.src = '/brand/mise-social.svg'; }} />
      <div className="recipe-image-top"><span>{recipe.country}</span><button type="button" id={'save-' + recipe.id} className={'save-button ' + (saved ? 'saved' : '')} onClick={onSave} aria-label={(saved ? 'Remove ' : 'Save ') + recipe.name + (saved ? ' from saved recipes' : ' to saved recipes')} title={saved ? 'Saved to your cookbook' : 'Save recipe'} aria-pressed={saved}><span className="save-heart"><Heart size={17} weight={saved ? 'fill' : 'regular'} /></span></button></div>
      <button type="button" className="recipe-image-action" onClick={onSelect} aria-label={'Cook ' + recipe.name}><ArrowUpRight size={22} /></button>
    </div>
    <div className="recipe-details">
      <div className="recipe-meta"><span>{recipe.region}</span><span className="meta-divider" /><span>{recipe.difficulty}</span></div>
      <a className="recipe-name" href={'/recipes/' + recipe.id + '/'}>{recipe.name}</a>
      <div className="recipe-bottom"><span>{recipe.ingredients.length} ingredients</span><span><Clock size={14} /> {recipe.minutes} min</span></div>
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
  const matching = useMemo(() => catalog.filter(recipe =>
    (!savedOnly || saved.includes(recipe.id)) &&
    (recipe.name + ' ' + recipe.country + ' ' + recipe.region + ' ' + recipe.tags.join(' ') + ' ' + recipe.story).toLowerCase().includes(search.trim().toLowerCase())
  ), [catalog, search, saved, savedOnly]);
  const filtered = useMemo(() => matching.filter(recipe => filter === 'All' || recipe.region === filter), [matching, filter]);

  const resetFilters = () => {
    setSearch(''); setFilter('All'); setSavedOnly(false);
    document.getElementById('recipe-search')?.focus({ preventScroll: true });
  };

  useRecipeReveal(resultsRoot, filtered.map(recipe => recipe.id).join(','));

  return <section className="discover-section" id="discover">
    <div className="discover-layout">
      <div className="discover-intro" id="discover-intro">
        <p className="eyebrow">Find your next meal</p>
        <h2>What sounds<br /><em>good?</em></h2>
        <p>Search by dish, ingredient or country. Every recipe includes quantities, timings and step-by-step instructions.</p>
        <div className="search-wrap"><MagnifyingGlass size={19} /><label htmlFor="recipe-search" className="visually-hidden">Search recipes or countries</label><input id="recipe-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Try noodles, tomato, Japan…" type="search" />{search && <button className="search-clear" type="button" aria-label="Clear recipe search" onClick={() => { setSearch(''); document.getElementById('recipe-search')?.focus(); }}><X size={17}/></button>}</div>
        <div className="filter-list" role="group" aria-label="Filter recipes by region">
          {regions.map(region => <button key={region} type="button" className={filter === region ? 'filter-active' : ''} onClick={() => setFilter(region)} aria-label={region} aria-pressed={filter === region}><span>{region}</span><small className="filter-count" aria-hidden="true">{matching.filter(recipe => region === 'All' || recipe.region === region).length}</small></button>)}
        </div>
        <button type="button" className={'saved-filter ' + (savedOnly ? 'is-active' : '')} onClick={() => setSavedOnly(!savedOnly)} aria-pressed={savedOnly}><Heart size={17} weight={savedOnly ? 'fill' : 'regular'} /> {savedOnly ? 'Showing saved recipes' : 'Only show my saved recipes'} <span>{saved.length}</span></button>
      </div>
      <div className="recipes-content" ref={resultsRoot}>
        <div className="recipes-topline"><span role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'recipe' : 'recipes'}{savedOnly ? ' saved' : ''}{filter !== 'All' ? ' · ' + filter : ''}</span>{(search || filter !== 'All' || savedOnly) && <button type="button" onClick={resetFilters}>Reset filters <X size={13}/></button>}</div>
        {filtered.length ? <div className="recipe-grid">
          {filtered.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} selected={selectedId === recipe.id} saved={saved.includes(recipe.id)} onSelect={() => { onSelect(recipe.id); scrollToSection('kitchen'); }} onSave={() => onToggleSave(recipe.id)} />)}
        </div> : <div className="empty-recipes"><MagnifyingGlass size={29} /><h3>{savedOnly && !saved.length ? 'Your saved recipes will appear here.' : 'No recipes found.'}</h3><p>{savedOnly && !saved.length ? 'Tap the heart on a recipe to keep it in your cookbook.' : 'Try a different search or reset your filters.'}</p><button type="button" onClick={resetFilters}>Show all recipes <ArrowRight size={17} /></button></div>}
        <div className="recipes-end"><span>Found something you like?</span><button type="button" onClick={() => scrollToSection('kitchen')}>Open the kitchen <ArrowRight size={16}/></button></div>
      </div>
    </div>
  </section>;
}

function Experience({ recipe }: { recipe: Recipe }) {
  return <section className="experience-section product-help" id="experience" aria-label="Cooking with Mise">
    <div className="product-help-intro"><h2>A place for<br /><em>your recipes.</em></h2><p>From the first ingredient to the last step.</p></div>
    <div className="product-help-links">
      <a href={'/?view=cook&recipe=' + recipe.id}><Clock size={23}/><span><strong>Keep your place at the stove</strong><small>Large instructions, step timers and optional read-aloud.</small></span><ArrowRight size={20}/></a>
      <a href="/cookbook/"><BookOpen size={23}/><span><strong>Make a cookbook of your own</strong><small>Keep favorites, add your recipes and organize collections.</small></span><ArrowRight size={20}/></a>
      <a href="/shopping/"><ClipboardText size={23}/><span><strong>Take your ingredients with you</strong><small>Build a shopping list from any recipe. Check things off as you go.</small></span><ArrowRight size={20}/></a>
    </div>
  </section>;
}

function Footer() {
  return <footer className="footer">
    <div className="footer-bottom"><Logo light /><p>A cookbook to make your own.</p><a href="#top" onClick={(e) => { e.preventDefault(); scrollToSection('top'); }}>Back to top <ArrowUpRight size={16} /></a></div>
  </footer>;
}

export default function App() {
  const root = useRef<HTMLElement>(null);
  usePageMotion(root);
  const native = useNativeApp();
  const feedback = useActionFeedback();
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
    const wasSaved = savedRecipeIds().includes(id);
    const name = catalog.find(recipe => recipe.id === id)?.name || 'Recipe';
    if (!setRecipeSaved(id, !wasSaved)) { feedback.show('Recipe could not be saved on this device.', undefined, true); return; }
    setSaved(savedRecipeIds());
    feedback.show(wasSaved ? name + ' removed from saved recipes.' : name + ' saved to your cookbook.', () => {
      if (!setRecipeSaved(id, wasSaved)) { feedback.show('Could not undo. Check device storage.', undefined, true); return; }
      setSaved(savedRecipeIds());
    });
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
    <Discover catalog={catalog} selectedId={selectedId} onSelect={setSelectedId} saved={saved} onToggleSave={toggleSaved} savedOnly={savedOnly} setSavedOnly={setSavedOnly} />
    <KitchenGateway key={selectedRecipe.id} recipe={selectedRecipe} onRecipeChange={setSelectedId} />
    <Experience recipe={selectedRecipe} />
    <Footer />
    <ActionFeedback notice={feedback.notice} dismiss={feedback.dismiss} />
    <NativeDialog app={native} open={settingsOpen} close={() => setSettingsOpen(false)} />
    <NativeNotices app={native} />
  </main>;
}
