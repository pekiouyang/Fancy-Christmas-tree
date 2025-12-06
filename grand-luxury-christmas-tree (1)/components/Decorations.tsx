import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';
import { CONFIG, COLORS, POLAROID_IMAGES } from '../constants';
import { getConePosition, getSpherePosition, randomRotation } from '../utils/math';

interface DecorationsProps {
  isUnleashed: boolean;
}

// Reusable dummy object for matrix calculations
const dummy = new THREE.Object3D();
const dummyPosition = new THREE.Vector3();

// --- Star (Tree Topper) ---
export const Star: React.FC<DecorationsProps> = ({ isUnleashed }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    
    const { shape, extrudeSettings } = useMemo(() => {
        const shape = new THREE.Shape();
        const points = 5;
        const outerRadius = 1.2;
        const innerRadius = 0.5;
        const step = Math.PI / points;

        for (let i = 0; i < 2 * points; i++) {
            const r = (i % 2 === 0) ? outerRadius : innerRadius;
            const a = i * step; 
            const x = r * Math.sin(a);
            const y = r * Math.cos(a);
            if (i === 0) shape.moveTo(x, y);
            else shape.lineTo(x, y);
        }
        shape.closePath();
        
        const extrudeSettings = {
            depth: 0.4,
            bevelEnabled: true,
            bevelThickness: 0.1,
            bevelSize: 0.1,
            bevelSegments: 2
        };
        
        return { shape, extrudeSettings };
    }, []);

    const targetPos = new THREE.Vector3(0, CONFIG.TREE_HEIGHT / 2 + 0.5, 0);
    const chaosPos = useMemo(() => getSpherePosition(CONFIG.CHAOS_RADIUS), []);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        
        const t = isUnleashed ? 1 : 0;
        
        // Position
        meshRef.current.position.lerp(isUnleashed ? chaosPos : targetPos, delta * 2);
        
        // Rotation
        if (isUnleashed) {
             meshRef.current.rotation.x += delta;
             meshRef.current.rotation.y += delta;
        } else {
             meshRef.current.rotation.y += delta * 0.5; // Slow spin
             meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, 0, delta * 2);
             meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0, delta * 2);
        }
    });

    return (
        <mesh ref={meshRef}>
            <extrudeGeometry args={[shape, extrudeSettings]} />
            <meshStandardMaterial 
                color="#FFD700" 
                emissive="#FFD700"
                emissiveIntensity={2}
                roughness={0.1}
                metalness={1}
            />
        </mesh>
    );
}

// --- Hanging Gifts (On Tree) ---
export const HangingGifts: React.FC<DecorationsProps> = ({ isUnleashed }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = CONFIG.HANGING_GIFT_COUNT;

  const data = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => ({
      targetPosition: getConePosition(i, count, CONFIG.TREE_HEIGHT, CONFIG.TREE_RADIUS * 1.05),
      chaosPosition: getSpherePosition(CONFIG.CHAOS_RADIUS),
      rotationOffset: randomRotation(),
      chaosRotation: randomRotation(),
      scale: 0.4 + Math.random() * 0.3, // Smaller than floor gifts
      color: Math.random() > 0.5 ? COLORS.GOLD : COLORS.RED
    }));
  }, [count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const t = isUnleashed ? 1 : 0;
    
    data.forEach((item, i) => {
      const currentPos = dummyPosition.lerpVectors(item.targetPosition, item.chaosPosition, t === 1 ? 0.05 : 0.05);
      
      dummy.position.copy(currentPos);
      
      if (isUnleashed) {
          dummy.rotation.x += delta;
          dummy.rotation.y += delta;
      } else {
          // Hang naturally or align somewhat
          dummy.rotation.copy(item.rotationOffset);
          dummy.rotation.y += delta * 0.2;
      }
      
      dummy.scale.setScalar(item.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, item.color as THREE.Color);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        roughness={0.2} 
        metalness={0.8} 
        envMapIntensity={1}
      />
    </instancedMesh>
  );
};


// --- Ornaments (Balls) ---
export const Ornaments: React.FC<DecorationsProps> = ({ isUnleashed }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = CONFIG.ORNAMENT_COUNT;

  const data = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => ({
      // Place ornaments slightly inside foliage
      targetPosition: getConePosition(i, count, CONFIG.TREE_HEIGHT, CONFIG.TREE_RADIUS * 0.9), 
      chaosPosition: getSpherePosition(CONFIG.CHAOS_RADIUS),
      targetRotation: new THREE.Euler(0, 0, 0),
      chaosRotation: randomRotation(),
      scale: 0.35 + Math.random() * 0.25,
      speed: 0.5 + Math.random() * 1.5, // Weight factor
      color: Math.random() > 0.3 ? COLORS.GOLD : COLORS.RED // Mix Gold and Red
    }));
  }, [count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const t = isUnleashed ? 1 : 0;
    
    data.forEach((item, i) => {
      // Calculate current position with individual Lerp speeds
      const currentPos = dummyPosition.lerpVectors(item.targetPosition, item.chaosPosition, t === 1 ? 0.05 * item.speed : 0.05);
      
      dummy.position.copy(currentPos);
      dummy.rotation.x += delta * 0.5;
      dummy.rotation.y += delta * 0.5;
      dummy.scale.setScalar(item.scale);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      
      // Update color per instance
      meshRef.current!.setColorAt(i, item.color as THREE.Color);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial 
        metalness={0.9} 
        roughness={0.1} 
        emissiveIntensity={0.1}
      />
    </instancedMesh>
  );
};

// --- Gift Boxes (Floor) ---
export const Gifts: React.FC<DecorationsProps> = ({ isUnleashed }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = CONFIG.GIFT_COUNT;

  const data = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
        // Place gifts at the bottom of the tree
        const angle = (i / count) * Math.PI * 2;
        const radius = 3.5 + Math.random() * 3; // Wider radius for gifts
        const bottomY = -CONFIG.TREE_HEIGHT / 2 + 0.5; // Sit on floor
        
        return {
          targetPosition: new THREE.Vector3(
              Math.cos(angle) * radius, 
              bottomY, 
              Math.sin(angle) * radius
          ),
          chaosPosition: getSpherePosition(CONFIG.CHAOS_RADIUS),
          scale: 0.8 + Math.random() * 0.5,
          rotationSpeed: Math.random(),
          color: Math.random() > 0.5 ? COLORS.RED : COLORS.GOLD
        };
    });
  }, [count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const t = isUnleashed ? 1 : 0;
    
    data.forEach((item, i) => {
       const currentPos = dummyPosition.lerpVectors(item.targetPosition, item.chaosPosition, 0.03);
       
       dummy.position.copy(currentPos);
       
       if (isUnleashed) {
         dummy.rotation.x += delta * item.rotationSpeed;
         dummy.rotation.y += delta * item.rotationSpeed;
       } else {
         dummy.rotation.set(0, (i / count) * Math.PI * 2, 0); // Face outward
       }
       dummy.scale.setScalar(item.scale);
       dummy.updateMatrix();
       meshRef.current!.setMatrixAt(i, dummy.matrix);
       meshRef.current!.setColorAt(i, item.color as THREE.Color);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.3} metalness={0.1} />
    </instancedMesh>
  );
};

// --- Polaroids ---
export const Polaroids: React.FC<DecorationsProps> = ({ isUnleashed }) => {
    const groupRef = useRef<THREE.Group>(null);
    
    const photos = useMemo(() => {
        return new Array(CONFIG.POLAROID_COUNT).fill(0).map((_, i) => ({
            id: i,
            targetPosition: getConePosition(i, CONFIG.POLAROID_COUNT, CONFIG.TREE_HEIGHT, CONFIG.TREE_RADIUS * 1.1),
            chaosPosition: getSpherePosition(CONFIG.CHAOS_RADIUS * 0.8),
            url: POLAROID_IMAGES[i % POLAROID_IMAGES.length],
            rotation: randomRotation()
        }));
    }, []);

    return (
        <group ref={groupRef}>
            {photos.map((photo) => (
                <PolaroidItem key={photo.id} data={photo} isUnleashed={isUnleashed} />
            ))}
        </group>
    );
};

interface PolaroidItemProps {
    data: any;
    isUnleashed: boolean;
}

const PolaroidItem: React.FC<PolaroidItemProps> = ({ data, isUnleashed }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const texture = useLoader(THREE.TextureLoader, data.url);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        const target = isUnleashed ? data.chaosPosition : data.targetPosition;
        meshRef.current.position.lerp(target, delta * 2);
        
        // Face camera when formed, tumble when chaos
        if (!isUnleashed) {
            meshRef.current.lookAt(0, meshRef.current.position.y, 0);
        } else {
            meshRef.current.rotation.x += delta;
        }
    });

    return (
        <mesh ref={meshRef}>
            <planeGeometry args={[1.2, 1.4]} />
            <meshStandardMaterial map={texture} side={THREE.DoubleSide} />
            {/* White Border for Polaroid effect */}
            <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[1.4, 1.6]} />
                <meshBasicMaterial color="white" />
            </mesh>
        </mesh>
    );
}