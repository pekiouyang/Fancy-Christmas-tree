import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CONFIG } from '../constants';
import { getSpherePosition } from '../utils/math';

const vertexShader = `
  uniform float uProgress;
  uniform float uTime;
  uniform float uPixelRatio;
  
  attribute vec3 aTargetPosition;
  attribute vec3 aChaosPosition;
  attribute float aRandomOffset;
  
  varying float vAlpha;
  
  // Cubic Ease InOut
  float ease(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    float t = ease(uProgress);
    
    vec3 mixedPos = mix(aTargetPosition, aChaosPosition, t);
    
    // Add flowing wave motion along the ribbon
    if (t < 0.1) {
        float wave = sin(mixedPos.y * 2.0 - uTime * 3.0);
        mixedPos.x += wave * 0.1;
        mixedPos.z += wave * 0.1;
    }

    vec4 mvPosition = modelViewMatrix * vec4(mixedPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Twinkle effect based on time and position
    float twinkle = sin(uTime * 5.0 + aRandomOffset * 20.0);
    vAlpha = (0.6 + twinkle * 0.4) * (1.0 - t * 0.5); // Fade out slightly in chaos
    
    // Make particles slightly larger for a "thicker" feel
    gl_PointSize = (50.0 * uPixelRatio) * (1.0 / -mvPosition.z);
  }
`;

const fragmentShader = `
  varying float vAlpha;
  
  void main() {
    // Soft glow particle
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    float strength = 1.0 - smoothstep(0.0, 0.5, dist);
    
    // Golden color
    vec3 gold = vec3(1.0, 0.8, 0.2);
    
    gl_FragColor = vec4(gold, strength * vAlpha);
  }
`;

interface RibbonProps {
  isUnleashed: boolean;
}

const Ribbon: React.FC<RibbonProps> = ({ isUnleashed }) => {
  const meshRef = useRef<THREE.Points>(null);
  const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  
  const { positions, chaosPositions, randoms } = useMemo(() => {
    const count = CONFIG.RIBBON_PARTICLE_COUNT;
    const pos = new Float32Array(count * 3);
    const chaos = new Float32Array(count * 3);
    const rnd = new Float32Array(count);
    
    const turns = 3.5; // Reduced from 6 to 3.5 for a wider spiral
    const height = CONFIG.TREE_HEIGHT;
    const maxRadius = CONFIG.TREE_RADIUS + 1.2; // Slightly wider than tree
    
    for (let i = 0; i < count; i++) {
        // Normalized progress 0 (Top) -> 1 (Bottom)
        const p = i / count;
        
        // Target: Spiral
        // Start angle at top, spiral down
        const angle = p * turns * Math.PI * 2;
        
        // Y Position: Start high, go low
        const y = (height / 2) - (p * height); 
        
        // Radius: Start small (Top), get wide (Bottom) to match tree cone
        // Match the tree's new curve logic (1.15) for consistency
        const radius = Math.pow(p, 1.15) * maxRadius;
        
        // Thickness/Scatter: Kept at 2.0 for thickness
        const widthScatter = (Math.random() - 0.5) * 2.0;
        const verticalScatter = (Math.random() - 0.5) * 0.5;

        // Apply polar coordinates with scatter
        const x = (radius + widthScatter) * Math.cos(angle);
        const z = (radius + widthScatter) * Math.sin(angle);
        
        pos.set([x, y + verticalScatter, z], i * 3);
        
        // Chaos: Random Sphere
        const sphere = getSpherePosition(CONFIG.CHAOS_RADIUS * 1.2);
        chaos.set([sphere.x, sphere.y, sphere.z], i * 3);
        
        rnd[i] = Math.random();
    }
    
    return { positions: pos, chaosPositions: chaos, randoms: rnd };
  }, []);

  const uniforms = useMemo(() => ({
    uProgress: { value: 0 },
    uTime: { value: 0 },
    uPixelRatio: { value: pixelRatio }
  }), [pixelRatio]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      const targetProgress = isUnleashed ? 1.0 : 0.0;
      
      material.uniforms.uProgress.value = THREE.MathUtils.lerp(
        material.uniforms.uProgress.value,
        targetProgress,
        delta * 2
      );
      
      material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aTargetPosition" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aChaosPosition" count={chaosPositions.length / 3} array={chaosPositions} itemSize={3} />
        <bufferAttribute attach="attributes-aRandomOffset" count={randoms.length} array={randoms} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default Ribbon;