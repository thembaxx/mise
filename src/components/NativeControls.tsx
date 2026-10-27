import { useEffect, useRef } from 'react';
import { DownloadSimple } from '@phosphor-icons/react/dist/csr/DownloadSimple';
import { Check } from '@phosphor-icons/react/dist/csr/Check';
import { CaretRight } from '@phosphor-icons/react/dist/csr/CaretRight';
import { CloudSlash } from '@phosphor-icons/react/dist/csr/CloudSlash';
import { ArrowsClockwise } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { SlidersHorizontal } from '@phosphor-icons/react/dist/csr/SlidersHorizontal';
import { ShareNetwork } from '@phosphor-icons/react/dist/csr/ShareNetwork';
import { DeviceMobile } from '@phosphor-icons/react/dist/csr/DeviceMobile';
import { WifiHigh } from '@phosphor-icons/react/dist/csr/WifiHigh';
import { X } from '@phosphor-icons/react/dist/csr/X';
import type { NativeAppState, ThemePreference } from '../pwa/useNativeApp';

export function NativeHeaderActions({ app, onSettings }: { app: NativeAppState; onSettings: () => void }) {
  return <>
    {app.canInstall && <button className="native-top-button native-install-button" type="button" onClick={() => void app.install()} aria-label="Install Mise"><DownloadSimple size={18} /></button>}
    <button className="native-top-button" type="button" onClick={onSettings} aria-label="Open app settings"><SlidersHorizontal size={19} /></button>
  </>;
}

export function NativeDialog({ app, open, close }: { app: NativeAppState; open: boolean; close: () => void }) {
  const sheetRef = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  useEffect(() => { closeRef.current = close; }, [close]);
  useEffect(() => {
    if (!open) return;
    const originalFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheetRef.current?.querySelector<HTMLButtonElement>('.native-close')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== 'Tab') return;
      const buttons = [...(sheetRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') || [])];
      if (!buttons.length) return;
      const first = buttons[0], last = buttons[buttons.length-1];
      if (event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
    };
    window.addEventListener('keydown', onKey);
    return () => {window.removeEventListener('keydown', onKey);document.body.style.overflow=originalOverflow;originalFocus?.focus();};
  }, [open]);

  return <div className="native-modal-backdrop native-settings-backdrop" hidden={!open} inert={!open} onClick={close}>
    <section ref={sheetRef} className="native-settings-sheet" role="dialog" aria-modal="true" aria-labelledby="native-settings-title" onClick={event => event.stopPropagation()}>
      <div className="native-modal-heading">
        <div><span className="native-kicker">MAKE IT YOURS</span><h2 id="native-settings-title">App settings</h2></div>
        <button type="button" className="native-close" onClick={close} aria-label="Close app settings"><X size={19}/></button>
      </div>
      <p className="native-panel-label">APPEARANCE</p>
      <div className="theme-segments" role="group" aria-label="Choose display theme">
        {(['system', 'light', 'dark'] as ThemePreference[]).map(pref => <button key={pref} type="button" aria-pressed={app.preference === pref} onClick={() => app.setPreference(pref)} className={app.preference === pref ? 'active' : ''}>{pref === 'system' ? 'System' : pref === 'light' ? 'Light' : 'Dark'}</button>)}
      </div>
      <p className="native-panel-helper">Use your device theme or keep Mise light or dark. Browser colors follow your choice where supported.</p>
      <p className="native-panel-label">ON YOUR DEVICE</p>
      <div className="native-settings-actions">
        {!app.isInstalled && <button type="button" onClick={() => void app.install()}><span className="native-action-icon"><DownloadSimple size={18} /></span><span><strong>Install Mise</strong><small>Add the kitchen to your home screen</small></span><CaretRight size={17}/></button>}
        <button type="button" onClick={() => void app.share()}><span className="native-action-icon"><ShareNetwork size={18}/></span><span><strong>Share Mise</strong><small>Send your kitchen to a friend</small></span><CaretRight size={17}/></button>
        <button type="button" onClick={() => void app.checkForUpdates()}><span className="native-action-icon"><ArrowsClockwise size={18}/></span><span><strong>Check for updates</strong><small>Get the newest experience</small></span><CaretRight size={17}/></button>
      </div>
      <div className="native-connectivity">
        {app.online ? <WifiHigh size={16}/> : <CloudSlash size={16}/>}
        <span>{!app.online ? 'You are offline' : app.offlineReady ? 'Offline kitchen ready' : 'Online · preparing offline access'}</span>
        {app.offlineReady && app.online && <Check size={15}/>}
      </div>
      <p className="native-footnote">Recipes, built-in controls and kitchen code are available offline after the app finishes caching. Previously unseen online recipe photos may not be available. Some browser features vary by device.</p>
    </section>
  </div>;
}

export function NativeNotices({ app }: { app: NativeAppState }) {
  return <>
    {!app.online && <div className="native-network-banner" role="status"><CloudSlash size={16}/> Offline mode — your saved kitchen experience is still here.</div>}
    {app.needRefresh && <div className="native-update-banner" role="status">
      <span><ArrowsClockwise size={17}/><strong>A fresher Mise is ready.</strong><small>Update when you've finished cooking.</small></span>
      <div><button type="button" onClick={app.dismissRefresh} className="native-update-later">Later</button><button type="button" onClick={app.activateUpdate} className="native-update-now">Update now</button></div>
    </div>}
    {app.message && <div className="native-feedback" role="status"><span>{app.message}</span><button type="button" aria-label="Dismiss notice" onClick={() => app.setMessage('')}><X size={17}/></button></div>}
    {app.installHelp && <div className="native-modal-backdrop" onClick={() => app.setInstallHelp(false)}>
      <section role="dialog" aria-modal="true" aria-labelledby="native-install-title" className="native-install-help" onClick={e => e.stopPropagation()}>
        <div className="native-modal-heading"><div><span className="native-kicker">ONE TAP AWAY</span><h2 id="native-install-title">Take Mise with you</h2></div><button type="button" className="native-close" aria-label="Close install guide" onClick={() => app.setInstallHelp(false)}><X size={19}/></button></div>
        <div className="native-install-art"><img src="/brand/mise-mark.svg" alt="" /><strong>Mise</strong><small>The world, on your table.</small></div>
        <div className="native-install-instructions">
          <span><DeviceMobile size={20}/></span>
          <p>{app.isIOS ? <>On iPhone or iPad, tap your browser's <strong>Share</strong> button, then choose <strong>Add to Home Screen</strong>. On newer versions it may appear under <strong>More</strong> or <strong>Open in Safari</strong>.</> : <>Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>, when available.</>}</p>
        </div>
        <button className="native-install-done" type="button" onClick={() => app.setInstallHelp(false)}>Got it <Check size={17}/></button>
      </section>
    </div>}
  </>;
}
