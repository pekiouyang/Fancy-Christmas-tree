import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CONFIG } from '../constants';
import { getConePosition, getSpherePosition } from '../utils/math';

// Custom Shader Material for Needles
const vertexShader = `
  uniform float uProgress;
  uniform float uTime;
  uniform float uPixelRatio;
  
  attribute vec3 aTargetPosition;
  attribute vec3 aChaosPosition;
  attribute float aRandomOffset;
  
  varying vec3 vColor;
  
  float ease(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    float t = ease(uProgress);
    
    // Mix positions
    vec3 mixedPos = mix(aTargetPosition, aChaosPosition, t);
    
    // Add subtle wind/breathing movement
    float wind = sin(uTime * 2.0 + aRandomOffset * 10.0 + mixedPos.y) * 0.15 * (1.0 - t);
    mixedPos.x += wind;
    mixedPos.z += wind * 0.5;
    
    vec4 mvPosition = modelViewMatrix * vec4(mixedPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation with Pixel Ratio support
    // Reduced base size from 25.0 to 18.0 for a sharper, less "ball-like" look
    gl_PointSize = (18.0 * uPixelRatio * (1.0 - t * 0.6)) * (20.0 / -mvPosition.z);
    
    // Color Palette: Natural Pine Green 🎄
    // Mix between a deep shadow green and a vibrant tip green
    vec3 pineDeep = vec3(0.02, 0.15, 0.05);  // Dark Forest Green
    vec3 pineFresh = vec3(0.1, 0.55, 0.2);   // Classic Christmas Green
    vec3 gold = vec3(1.0, 0.85, 0.3);        // Gold Sparkle
    
    // Use y-position to make top slightly lighter (sunlight)
    float heightGradient = smoothstep(-7.0, 7.0, mixedPos.y);
    
    vec3 baseColor = mix(pineDeep, pineFresh, aRandomOffset * 0.7 + heightGradient * 0.3);
    
    vColor = baseColor;
    
    // Dynamic lighting simulation
    float light = dot(normalize(mixedPos), vec3(0.5, 0.8, 0.5));
    vColor += light * 0.15; // Specular shine

    // Gold shimmer in chaos mode or random sparkles in tree mode
    float sparkle = step(0.98, sin(uTime * 5.0 + aRandomOffset * 100.0));
    vColor = mix(vColor, gold, t * 0.5 + sparkle * 0.3);
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  
  void main() {
    // Soft particle texture (simulating a needle cluster)
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    float alpha = 1.0 - smoothstep(0.1, 0.5, dist);
    
    if (alpha < 0.1) discard;
    
    gl_FragColor = vec4(vColor, alpha);
  }
`;

interface NeedlesProps {
  isUnleashed: boolean;
}

const Needles: React.FC<NeedlesProps> = ({ isUnleashed }) => {
  const meshRef = useRef<THREE.Points>(null);
  const { viewport } = useThree();
  const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  
  // Generate geometry data
  const { positions, chaosPositions, randoms } = useMemo(() => {
    const pos = new Float32Array(CONFIG.NEEDLE_COUNT * 3);
    const chaos = new Float32Array(CONFIG.NEEDLE_COUNT * 3);
    const rnd = new Float32Array(CONFIG.NEEDLE_COUNT);
    
    for (let i = 0; i < CONFIG.NEEDLE_COUNT; i++) {
      // Standard tree radius
      const target = getConePosition(i, CONFIG.NEEDLE_COUNT, CONFIG.TREE_HEIGHT, CONFIG.TREE_RADIUS);
      
      // Volume jitter for organic fluffiness
      target.x += (Math.random() - 0.5) * 0.8;
      target.y += (Math.random() - 0.5) * 0.8;
      target.z += (Math.random() - 0.5) * 0.8;
      
      const sphere = getSpherePosition(CONFIG.CHAOS_RADIUS);
      
      pos.set([target.x, target.y, target.z], i * 3);
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
        delta * 2.5
      );
      
      material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTargetPosition"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aChaosPosition"
          count={chaosPositions.length / 3}
          array={chaosPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandomOffset"
          count={randoms.length}
          array={randoms}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.NormalBlending} // Changed from Additive for more solid look
      />
    </points>
  );
};

export default Needles;