import * as THREE from 'three';
import { CONFIG } from '../constants';

// Golden Angle for natural spiral distribution
const PHI = Math.PI * (3 - Math.sqrt(5));

export const getConePosition = (index: number, total: number, height: number, maxRadius: number): THREE.Vector3 => {
  // Normalized progress from 0 (Top) to 1 (Bottom)
  const progress = index / total;
  
  // Y goes from Top (+height/2) to Bottom (-height/2)
  const y = (height / 2) - (progress * height);
  
  // Radius: 0 at the top (progress 0), maxRadius at the bottom (progress 1)
  // Changed power from 0.8 to 1.15 to make it sweep inward (concave) rather than bulge outward (convex)
  const radius = Math.pow(progress, 1.15) * maxRadius;
  
  const angle = index * PHI;
  
  const x = radius * Math.cos(angle);
  const z = radius * Math.sin(angle);
  
  return new THREE.Vector3(x, y, z);
};

export const getSpherePosition = (radius: number): THREE.Vector3 => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius; // Uniform distribution inside sphere
  
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
};

export const randomRotation = (): THREE.Euler => {
  return new THREE.Euler(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2
  );
};