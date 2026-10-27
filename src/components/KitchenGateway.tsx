import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import { ChefHat } from '@phosphor-icons/react/dist/csr/ChefHat';
import { Sparkle } from '@phosphor-icons/react/dist/csr/Sparkle';
import type { Recipe } from '../data/recipes';

const KitchenStudio = lazy(() => import('./KitchenStudio'));

type Props = { recipe: Recipe; onRecipeChange: (id: string) => void };

function KitchenLoading({ onEnter }: { onEnter?: () => void }) {
  return (
    <section className="studio-preload" aria-label="3D cooking studio">
      <div className="studio-preload-copy">
        <p className="eyebrow"><span className="eyebrow-dot" /> YOUR CREATIVE SPACE</p>
        <h2>Pull up a chair.<br /><em>Let's cook.</em></h2>
        <p>Fresh ingredients, a proper pan and a whole world of flavors. Your interactive kitchen is just around the corner.</p>
        {onEnter ? (
          <button type="button" onClick={onEnter} className="button-dark">Enter the kitchen <span><ArrowUpRight size={20} /></span></button>
        ) : (
          <p className="kitchen-loading-note" role="status"><ChefHat size={18} /> Preparing your workspace…</p>
        )}
      </div>
      <div className="studio-preload-art" aria-hidden="true">
        <div className="studio-plate">
          <span className="studio-food-leaf first" />
          <span className="studio-food-leaf second" />
          <span className="studio-food-dot" />
        </div>
        <Sparkle size={28} />
      </div>
    </section>
  );
}

export default function KitchenGateway({ recipe, onRecipeChange }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [activated, setActivated] = useState(() => {
    const view = new URLSearchParams(window.location.search).get('view');
    return view === 'cook' || view === 'kitchen';
  });

  useEffect(() => {
    if (activated) return;
    if (typeof IntersectionObserver === 'undefined') {
      setActivated(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) setActivated(true);
    }, { rootMargin: '550px 0px' });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, [activated]);

  return <div id="kitchen" ref={root}>
    {activated
      ? <Suspense fallback={<KitchenLoading />}><KitchenStudio recipe={recipe} onRecipeChange={onRecipeChange} /></Suspense>
      : <KitchenLoading onEnter={() => setActivated(true)} />}
  </div>;
}
