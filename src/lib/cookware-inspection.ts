import * as THREE from 'three';

export interface CookwareInspectionPart {
  object: THREE.Object3D;
  direction?: THREE.Vector3;
  distance?: number;
  rotation?: THREE.Vector3;
}

interface PartSnapshot {
  object: THREE.Object3D;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  direction: THREE.Vector3;
  rotation: THREE.Vector3;
  distance: number;
}

const snapshots = new WeakMap<THREE.Group, PartSnapshot[]>();

/**
 * Register semantic cookware pieces (pan body, lid, handle, fasteners, insert).
 * The controller preserves the original hierarchy and only offsets registered
 * roots, so Rapier colliders and ingredient interaction volumes remain untouched.
 */
export function prepareCookwareInspection(root: THREE.Group, parts: CookwareInspectionPart[]) {
  const existing = snapshots.get(root);
  if (existing) return existing;
  root.updateMatrixWorld(true);
  const entries = parts.map((part, index) => {
    const direction = part.direction?.clone() ?? new THREE.Vector3(
      Math.cos(index * 2.399963229728653),
      index % 2 === 0 ? 0.38 : -0.24,
      Math.sin(index * 2.399963229728653),
    );
    if (direction.lengthSq() < 1e-8) direction.set(0, 1, 0);
    direction.normalize();
    return {
      object: part.object,
      position: part.object.position.clone(),
      quaternion: part.object.quaternion.clone(),
      direction,
      rotation: part.rotation?.clone() ?? new THREE.Vector3(0, (index % 2 ? -1 : 1) * 0.12, 0),
      distance: THREE.MathUtils.clamp(part.distance ?? 0.48 + index * 0.08, 0, 2),
    };
  });
  snapshots.set(root, entries);
  return entries;
}

/** A deterministic scrub value from 0 (assembled) to 1 (fully inspected). */
export function setCookwareInspection(root: THREE.Group, progress: number): number {
  const entries = snapshots.get(root);
  if (!entries) return 0;
  const amount = THREE.MathUtils.clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
  const eased = amount * amount * (3 - 2 * amount);
  for (const entry of entries) {
    entry.object.position.copy(entry.position).addScaledVector(entry.direction, entry.distance * eased);
    entry.object.quaternion.copy(entry.quaternion);
    entry.object.rotateX(entry.rotation.x * eased);
    entry.object.rotateY(entry.rotation.y * eased);
    entry.object.rotateZ(entry.rotation.z * eased);
  }
  root.updateMatrixWorld(true);
  return amount;
}

export function restoreCookwareAssembly(root: THREE.Group): number {
  return setCookwareInspection(root, 0);
}
