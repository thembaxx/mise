import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import {
  createSceneInspectionController,
  sceneTimelineProgress,
} from '../lib/scene-inspection';

describe('deterministic scene inspection', () => {
  it('separates authored components and restores their original transforms', () => {
    const root = new Group();
    const pan = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
    const lid = new Mesh(new BoxGeometry(1, 0.2, 1), new MeshStandardMaterial());
    pan.position.x = -0.8;
    lid.position.set(0.8, 0.5, 0);
    root.add(pan, lid);
    const originalPan = pan.position.clone();
    const originalLid = lid.position.clone();
    const inspection = createSceneInspectionController(root, { gap: 0.2 });

    inspection.setProgress(0.5);
    expect(pan.position.distanceTo(originalPan)).toBeGreaterThan(0);
    expect(lid.position.distanceTo(originalLid)).toBeGreaterThan(0);
    inspection.setProgress(1);
    const separatedPan = pan.position.clone();
    inspection.setProgress(1);
    expect(pan.position.toArray()).toEqual(separatedPan.toArray());
    inspection.dispose();
    expect(pan.position.toArray()).toEqual(originalPan.toArray());
    expect(lid.position.toArray()).toEqual(originalLid.toArray());
  });

  it('provides a deterministic clamped timeline', () => {
    expect(sceneTimelineProgress(250, 1000)).toBe(0.25);
    expect(sceneTimelineProgress(-1, 1000)).toBe(0);
    expect(sceneTimelineProgress(2000, 1000)).toBe(1);
    expect(sceneTimelineProgress(0, 0)).toBe(1);
  });
});
