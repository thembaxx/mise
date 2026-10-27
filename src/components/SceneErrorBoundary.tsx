import { Component, useEffect, useState, type ReactNode } from 'react';
import { diagnostics } from '../lib/diagnostics';
import { WarningCircle } from '@phosphor-icons/react/dist/csr/WarningCircle';
import { ChefHat } from '@phosphor-icons/react/dist/csr/ChefHat';

type Props = { children: ReactNode };
type State = { unavailable: boolean };

function Fallback() {
  return <div className="scene-unavailable" role="status">
    <div className="scene-unavailable-plate" aria-hidden="true"><ChefHat size={44} /></div>
    <div>
      <p className="scene-unavailable-overline"><WarningCircle size={15} /> LITE KITCHEN MODE</p>
      <h4>Your recipe is still ready.</h4>
      <p>3D graphics couldn't start on this device. No problem: follow the steps, use your timer, and tap ingredients in the checklist to cook along without WebGL.</p>
    </div>
  </div>;
}

export default class SceneErrorBoundary extends Component<Props, State> {
  state: State = { unavailable: false };

  static getDerivedStateFromError(): State {
    return { unavailable: true };
  }

  componentDidCatch() {
    diagnostics.record('webgl_start', 'failure', { code: 'scene_error' });
  }

  render() {
    if (this.state.unavailable) return <Fallback />;
    return this.props.children;
  }
}

export function SupportsWebGL({ children }: Props) {
  const [supported] = useState(() => {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl2'));
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!supported) diagnostics.record('webgl_start', 'failure', { code: 'unsupported' });
    const contextLost = (event: Event) => {
      if (event.target instanceof HTMLCanvasElement && event.target.matches('.kitchen-canvas canvas')) {
        diagnostics.record('webgl_context', 'failure', { code: 'context_lost' });
      }
    };
    window.addEventListener('webglcontextlost', contextLost, true);
    return () => window.removeEventListener('webglcontextlost', contextLost, true);
  }, [supported]);
  return supported ? <>{children}</> : <Fallback />;
}
