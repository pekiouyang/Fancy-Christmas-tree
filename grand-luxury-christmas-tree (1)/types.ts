import * as THREE from 'three';

export interface TreeSystemProps {
  isUnleashed: boolean;
}

export interface DecorationData {
  id: number;
  targetPosition: THREE.Vector3;
  chaosPosition: THREE.Vector3;
  targetRotation: THREE.Euler;
  chaosRotation: THREE.Euler;
  scale: number;
  type: 'ornament' | 'gift' | 'polaroid';
  color?: string;
  textureUrl?: string;
}

export interface Uniforms {
  [uniform: string]: THREE.IUniform;
}

export interface InteractionState {
  rotation: number; // Target Y rotation
  scale: number;    // Target Scale
  isHovering: boolean; // Is hand detected?
}