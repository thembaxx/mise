import { Component, type ReactNode } from 'react';
import { AlertCircle, ChefHat } from 'lucide-react';

type Props = { children: ReactNode };
type State = { unavailable: boolean };

function Fallback() {
  return <div className="scene-unavailable" role="status">
    <div className="scene-unavailable-plate" aria-hidden="true"><ChefHat size={44} strokeWidth={1.3} /></div>
    <div>
      <p className="scene-unavailable-overline"><AlertCircle size={15} /> LITE KITCHEN MODE</p>
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

  render() {
    if (this.state.unavailable) return <Fallback />;
    return this.props.children;
  }
}

export function SupportsWebGL({ children }: Props) {
  let supported = false;
  try {
    const canvas = document.createElement('canvas');
    supported = Boolean(canvas.getContext('webgl2'));
  } catch {
    supported = false;
  }
  return supported ? <>{children}</> : <Fallback />;
}
