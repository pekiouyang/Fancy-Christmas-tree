import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import Needles from './Needles';
import Ribbon from './Ribbon';
import { Ornaments, Gifts, HangingGifts, Polaroids, Star } from './Decorations';
import { InteractionState } from '../types';

interface SceneProps {
  isUnleashed: boolean;
  interactionRef?: React.MutableRefObject<InteractionState>;
}

// Custom camera rig that respects external interaction
const CameraRig = ({ isUnleashed }: { isUnleashed: boolean }) => {
  const { camera, mouse } = useThree();
  const initialPos = useRef(new THREE.Vector3(0, 2, 22));

  useFrame((state, delta) => {
    // Standard mouse parallax (always active for subtle feel)
    const targetX = initialPos.current.x + (mouse.x * 2); 
    const targetY = initialPos.current.y + (mouse.y * 1);
    const shake = isUnleashed ? Math.sin(state.clock.elapsedTime * 20) * 0.3 : 0;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX + shake, delta * 2);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY + shake, delta * 2);
    camera.lookAt(0, -1, 0); 
  });
  
  return null;
}

const TreeGroup: React.FC<SceneProps> = ({ isUnleashed, interactionRef }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (groupRef.current && interactionRef) {
            // Smoothly interpolate rotation based on hand X
            const targetRotY = interactionRef.current.isHovering ? interactionRef.current.rotation : 0;
            const targetScale = interactionRef.current.isHovering ? interactionRef.current.scale : 1;

            groupRef.current.rotation.y = THREE.MathUtils.lerp(
                groupRef.current.rotation.y, 
                targetRotY, 
                delta * 3
            );

            // Smooth scale
            const currentScale = groupRef.current.scale.x;
            const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 2);
            groupRef.current.scale.setScalar(newScale);
        }
    });

    return (
        <group ref={groupRef} position={[0, -1, 0]}>
            <Star isUnleashed={isUnleashed} />
            <Needles isUnleashed={isUnleashed} />
            <Ribbon isUnleashed={isUnleashed} />
            
            <Ornaments isUnleashed={isUnleashed} />
            <HangingGifts isUnleashed={isUnleashed} />
            <Gifts isUnleashed={isUnleashed} />
            <Polaroids isUnleashed={isUnleashed} />
            
            {/* Trunk */}
            <mesh position={[0, -6, 0]}>
                <cylinderGeometry args={[0.8, 1.8, 5, 8]} />
                <meshStandardMaterial color="#2d1b0e" roughness={0.9} />
            </mesh>
            
            {/* Reflective Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -8.5, 0]}>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial 
                    color="#001a14" 
                    metalness={0.9} 
                    roughness={0.15} 
                    envMapIntensity={0.8} 
                />
            </mesh>
        </group>
    )
}

const Scene: React.FC<SceneProps> = ({ isUnleashed, interactionRef }) => {
  return (
    <Canvas 
      dpr={[1, 2]} 
      gl={{ 
        antialias: false, 
        toneMapping: THREE.ACESFilmicToneMapping, 
        toneMappingExposure: 1.2 
      }}
    >
        <PerspectiveCamera makeDefault position={[0, 2, 22]} fov={45} />
        <CameraRig isUnleashed={isUnleashed} />
        
        {/* Atmosphere */}
        <color attach="background" args={['#00100d']} />
        <fog attach="fog" args={['#00100d', 15, 50]} />
        
        {/* Cinematic Lighting */}
        <ambientLight intensity={0.5} color="#aaddcc" />
        
        <spotLight 
          position={[10, 20, 15]} 
          angle={0.4} 
          penumbra={1} 
          intensity={3} 
          color="#ffd700" 
          castShadow 
        />
        
        <spotLight position={[-10, 10, -10]} intensity={2} color="#00ffaa" />
        
        <Environment preset="city" background={false} />
        
        {/* Transformable Tree Group */}
        <TreeGroup isUnleashed={isUnleashed} interactionRef={interactionRef} />

        {/* Post Processing */}
        <EffectComposer disableNormalPass>
          <Bloom 
            luminanceThreshold={0.7} 
            mipmapBlur 
            intensity={1.2} 
            radius={0.6}
          />
          <Vignette eskil={false} offset={0.2} darkness={0.5} />
          <Noise opacity={0.05} />
        </EffectComposer>
        
        <OrbitControls 
            enablePan={false} 
            enableZoom={true}
            minPolarAngle={Math.PI / 3} 
            maxPolarAngle={Math.PI / 1.9}
            minDistance={15}
            maxDistance={35}
            enabled={!interactionRef?.current?.isHovering} 
        />
    </Canvas>
  );
};

export default Scene;