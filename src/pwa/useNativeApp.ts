import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export type ThemePreference = 'system' | 'light' | 'dark';

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
type NativeNavigator = Navigator & { standalone?: boolean };

const KEY = 'mise:theme';

export function readThemePreference(): ThemePreference {
  try {
    const pref = localStorage.getItem(KEY);
    return pref === 'dark' || pref === 'light' ? pref : 'system';
  } catch {
    return 'system';
  }
}

export function resolveTheme(preference: ThemePreference, systemIsDark: boolean): 'dark' | 'light' {
  return preference === 'system' ? (systemIsDark ? 'dark' : 'light') : preference;
}

function supportsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || Boolean((navigator as NativeNavigator).standalone);
}

export function useNativeApp() {
  const [preference, setPreference] = useState<ThemePreference>(() => readThemePreference());
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(() => supportsStandalone());
  const [isIOS] = useState(() => /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [installHelp, setInstallHelp] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [message, setMessage] = useState('');
  const updateSW = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const swRegistration = useRef<ServiceWorkerRegistration | undefined>(undefined);

  const resolvedTheme = resolveTheme(preference, systemDark);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const change = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = resolvedTheme === 'dark' ? '#111B17' : '#F7F6F1';
    try { localStorage.setItem(KEY, preference); } catch { /* blocked storage */ }
  }, [preference, resolvedTheme]);

  useEffect(() => {
    const syncOnline = () => setOnline(navigator.onLine);
    const installed = () => { setIsInstalled(true); setInstallPrompt(null); setInstallHelp(false); };
    const installable = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const onDisplayMode = () => setIsInstalled(supportsStandalone());
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    window.addEventListener('beforeinstallprompt', installable);
    window.addEventListener('appinstalled', installed);
    const query = window.matchMedia('(display-mode: standalone)');
    query.addEventListener('change', onDisplayMode);
    return () => {
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
      window.removeEventListener('beforeinstallprompt', installable);
      window.removeEventListener('appinstalled', installed);
      query.removeEventListener('change', onDisplayMode);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    updateSW.current = registerSW({
      immediate: true,
      onNeedRefresh: () => setNeedRefresh(true),
      onOfflineReady: () => setOfflineReady(true),
      onRegisteredSW: (_url, registration) => { swRegistration.current = registration; },
      onRegisterError: () => setMessage('Offline installation is unavailable on this browser.'),
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void swRegistration.current?.update().catch(() => { /* next visit may retry */ });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const install = useCallback(async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const response = await installPrompt.userChoice;
        setInstallPrompt(null);
        if (response.outcome === 'accepted') setMessage('Installation accepted. Check your home screen shortly.');
      } catch { setInstallHelp(true); }
      return;
    }
    setInstallHelp(true);
  }, [installPrompt]);

  const share = useCallback(async () => {
    const url = window.location.origin + '/';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Mise — The world, on your table', text: 'Discover global recipes and an interactive kitchen.', url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setMessage('Mise link copied.');
      } else {
        setMessage('Share this link: ' + url);
      }
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') setMessage('Sharing is unavailable. Copy the URL from the address bar.');
    }
  }, []);

  const checkForUpdates = useCallback(async () => {
    try {
      const reg = swRegistration.current || await navigator.serviceWorker?.getRegistration();
      if (!reg) { setMessage('Updates will be available after the app is installed for offline use.'); return; }
      await reg.update();
      if (reg.waiting) setNeedRefresh(true);
      else setMessage('Update check completed.');
    } catch { setMessage('Could not check for updates while offline.'); }
  }, []);

  const activateUpdate = useCallback(() => {
    void updateSW.current?.(true);
  }, []);

  return {
    preference, setPreference, resolvedTheme, online, isInstalled, isIOS,
    canInstall: !isInstalled && (Boolean(installPrompt) || isIOS),
    install, installHelp, setInstallHelp, needRefresh, dismissRefresh: () => setNeedRefresh(false),
    activateUpdate, offlineReady, share, checkForUpdates, message, setMessage,
  };
}

export type NativeAppState = ReturnType<typeof useNativeApp>;
