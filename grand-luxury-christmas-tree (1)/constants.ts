import * as THREE from 'three';

export const COLORS = {
  EMERALD: new THREE.Color('#0f5d26'), // More natural Pine
  GOLD: new THREE.Color('#FFD700'),
  SILVER: new THREE.Color('#C0C0C0'),
  RED: new THREE.Color('#C41E3A'), // Cardinal Red
  WARM_WHITE: new THREE.Color('#FFFDD0'),
};

export const CONFIG = {
  TREE_HEIGHT: 15,
  TREE_RADIUS: 4.8, // Reduced from 6.5 for a slender, elegant look
  NEEDLE_COUNT: 18000, // Reduced from 25000 to de-bulk the volume
  ORNAMENT_COUNT: 200,
  GIFT_COUNT: 30, // Floor gifts
  HANGING_GIFT_COUNT: 60, // New: Gifts on the tree
  POLAROID_COUNT: 24,
  CHAOS_RADIUS: 30,
  RIBBON_PARTICLE_COUNT: 12000, // Increased 3x for density
};

export const POLAROID_IMAGES = [
  "https://picsum.photos/200/200?random=1",
  "https://picsum.photos/200/200?random=2",
  "https://picsum.photos/200/200?random=3",
  "https://picsum.photos/200/200?random=4",
  "https://picsum.photos/200/200?random=5",
  "https://picsum.photos/200/200?random=6",
];