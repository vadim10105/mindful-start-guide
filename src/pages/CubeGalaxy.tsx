import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';

interface CubeProps {
  position: [number, number, number];
  color: string;
  isCenter?: boolean;
  number?: number;
}

const OutlinedCube: React.FC<CubeProps> = ({ position, color, isCenter = false, number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);

  return (
    <group position={position}>
      {/* Solid cube */}
      <mesh ref={meshRef}>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Black outline edges */}
      <lineSegments ref={edgesRef}>
        <edgesGeometry args={[new THREE.BoxGeometry(1.2, 1.2, 1.2)]} />
        <lineBasicMaterial color="#000000" linewidth={1} />
      </lineSegments>
      {/* Number label on top face */}
      {number && (
        <Text
          position={[0, 0.7, 0]}
          fontSize={0.3}
          color="black"
          anchorX="center"
          anchorY="middle"
          rotation={[-Math.PI / 2, 0, 0]}
        >
          {number}
        </Text>
      )}
    </group>
  );
};

const CubeGalaxy: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<THREE.Group>(null);
  const animationRefs = useRef<gsap.core.Tween[]>([]);
  const isHovered = useRef(false);

  // Generate the 16 cube positions (removed top-front-right corner and connected cubes)
  const shellPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    const spacing = 1.3;
    
    // Layer 1 (bottom, y = -spacing): 1 1 1 / 1 1 1 / 1 1 1 (COMPLETELY FILLED)
    positions.push([-spacing, -spacing, -spacing]); // back-left
    positions.push([0, -spacing, -spacing]);        // back-center
    positions.push([spacing, -spacing, -spacing]);  // back-right
    positions.push([-spacing, -spacing, 0]);        // middle-left
    positions.push([0, -spacing, 0]);               // center bottom (NOW FILLED)
    positions.push([spacing, -spacing, 0]);         // middle-right
    positions.push([-spacing, -spacing, spacing]);  // front-left
    positions.push([0, -spacing, spacing]);         // front-center
    positions.push([spacing, -spacing, spacing]);   // front-right
    
    // Layer 2 (middle, y = 0): 1 1 1 / 1 2 1 / 1 0 1 (REMOVE CUBES 14 & 16)
    positions.push([-spacing, 0, -spacing]);        // back-left
    positions.push([0, 0, -spacing]);               // back-center (NOW FILLED)
    positions.push([spacing, 0, -spacing]);         // back-right
    positions.push([-spacing, 0, 0]);               // middle-left (NOW FILLED)
    // center is orange cube (2) - handled separately
    // Remove: middle-right (cube 14)
    positions.push([-spacing, 0, spacing]);         // front-left
    // Remove: front-center (cube 16)
    // Remove: front-right (connects to top-front-right)
    
    // Layer 3 (top, y = spacing): 1 1 1 / 1 0 1 / 1 1 1
    positions.push([-spacing, spacing, -spacing]);  // back-left
    positions.push([0, spacing, -spacing]);         // back-center
    positions.push([spacing, spacing, -spacing]);   // back-right
    positions.push([-spacing, spacing, 0]);         // middle-left
    // center top is empty (0)
    // Remove: middle-right (connects to top-front-right)
    positions.push([-spacing, spacing, spacing]);   // front-left
    // Remove: front-center (connects to top-front-right)
    // Remove: front-right (the corner we're removing)
    
    return positions;
  }, []);

  const updateCubeStates = () => {
    if (!groupRef.current) return;

    const cubes = groupRef.current.children.filter((child, index) => index < 19);
    
    // Clear existing animations
    animationRefs.current.forEach(tween => tween.kill());
    animationRefs.current = [];
    
    cubes.forEach((cube, index) => {
      const originalPosition = shellPositions[index];
      const radius = 2.5 + Math.random() * 2;
      const speed = 4 + Math.random() * 4;
      const yOffset = (Math.random() - 0.5) * 1.5;
      
      // Animation data that will be continuously updated
      const animationData = { 
        angle: Math.random() * Math.PI * 2,
        mixFactor: isHovered.current ? 1 : 0 // 1 = original position, 0 = galaxy position
      };
      
      // Continuous orbital animation
      const orbitalTween = gsap.to(animationData, {
        angle: animationData.angle + Math.PI * 2,
        duration: speed,
        ease: "none",
        repeat: -1,
        onUpdate: () => {
          // Calculate galaxy position
          const galaxyX = Math.cos(animationData.angle) * radius;
          const galaxyZ = Math.sin(animationData.angle) * radius;
          const galaxyY = yOffset + Math.sin(animationData.angle * 2) * 0.3;
          
          // Interpolate between galaxy and original position based on mixFactor
          cube.position.x = gsap.utils.interpolate(galaxyX, originalPosition[0], animationData.mixFactor);
          cube.position.y = gsap.utils.interpolate(galaxyY, originalPosition[1], animationData.mixFactor);
          cube.position.z = gsap.utils.interpolate(galaxyZ, originalPosition[2], animationData.mixFactor);
        }
      });
      
      animationRefs.current.push(orbitalTween);
    });
  };

  const setHoverState = (hovered: boolean) => {
    isHovered.current = hovered;
    
    if (!groupRef.current) return;
    const cubes = groupRef.current.children.filter((child, index) => index < 19);
    
    cubes.forEach((cube, index) => {
      // Find the animation data for this cube and smoothly transition mixFactor
      const animationData = animationRefs.current[index]?.targets()?.[0];
      if (animationData) {
        gsap.to(animationData, {
          mixFactor: hovered ? 1 : 0,
          duration: 1.2,
          ease: "power2.out"
        });
      }
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseEnter = () => setHoverState(true);
    const handleMouseLeave = () => setHoverState(false);

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    // Start in formation (no animation for now)
    // setTimeout(() => updateCubeStates(), 100);

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      animationRefs.current.forEach(tween => tween.kill());
    };
  }, [shellPositions]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center"
    >
      <div className="w-[600px] h-[600px]">
        <Canvas
          orthographic
          camera={{
            position: [8, 8, 8],
            zoom: 80,
          }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={0.8} />
          
          <group ref={groupRef}>
            {/* 21 shell cubes */}
            {shellPositions.map((position, index) => (
              <OutlinedCube
                key={index}
                position={position}
                color="#e5e7eb"
              />
            ))}
            
            {/* Center orange cube */}
            <OutlinedCube
              position={[0, 0, 0]}
              color="#f97316"
              isCenter={true}
            />
          </group>
        </Canvas>
      </div>
      
      <div className="absolute bottom-8 left-8 text-white/60 text-sm">
        Hover to see original formation
      </div>
    </div>
  );
};

export default CubeGalaxy;