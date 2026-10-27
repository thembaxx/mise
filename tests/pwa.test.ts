import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const source = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

describe('Mise offline-first PWA', () => {
  it('pre-caches the application shell, recipes, and deferred kitchen in Workbox', () => {
    const config = source('vite.config.ts');
    expect(config).toContain("VitePWA({");
    expect(config).toContain("registerType: 'prompt'");
    expect(config).toContain("manifest: false");
    expect(config).toContain("maximumFileSizeToCacheInBytes:");
    expect(config).toContain("navigateFallback: '/index.html'");
    expect(config).toContain("cleanupOutdatedCaches: true");
    expect(config).toContain("mise-food-images-v1");
  });
  it('keeps Web App Manifest app install and shortcut destinations inside our scope', () => {
    const manifest = JSON.parse(source('public/manifest.webmanifest'));
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.shortcuts.map((shortcut: {url: string}) => shortcut.url)).toEqual(['/?view=discover','/cookbook/','/?view=kitchen']);
    expect(manifest.share_target).toEqual({action:'/cookbook/',method:'GET',enctype:'application/x-www-form-urlencoded',params:{title:'title',text:'text',url:'url'}});
    expect(manifest.background_color).toBe('#F7F6F1');
  });
  it('matches browser launch backgrounds across safe areas and first paint', () => {
    const html = source('index.html');
    expect(html).toContain('viewport-fit=cover');
    expect(html).toContain('name="theme-color" content="#F7F6F1"');
    expect(html).toContain('rel="apple-touch-startup-image"');
    expect(html).toContain('mise-boot');
    expect(source('src/styles.css')).toContain('safe-area-inset-top');
    expect(source('src/styles.css')).toContain('safe-area-inset-bottom');
    expect(source('scripts/generate-brand-assets.mjs')).toContain('generateSplash');
  });
  it('lets users choose update timing instead of interrupting cooking', () => {
    const hook = source('src/pwa/useNativeApp.ts');
    expect(hook).toContain("registerSW({");
    expect(hook).toContain('onNeedRefresh');
    expect(hook).toContain('setNeedRefresh(true)');
    expect(hook).toContain('updateSW.current(true)');
    expect(hook).toContain('navigator.serviceWorker.ready');
    expect(hook).toContain('mise:theme');
  });
  it('provides accessible controls even without install support', () => {
    const controls = source('src/components/NativeControls.tsx');
    expect(controls).toContain('aria-modal="true"');
    expect(controls).toContain('System');
    expect(controls).toContain('Light');
    expect(controls).toContain('Dark');
    expect(controls).toContain('Add to Home Screen');
    expect(controls).toContain('Check for updates');
  });
});
