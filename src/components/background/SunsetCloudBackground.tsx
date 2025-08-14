import React, { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Cloud, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function SunsetBackground() {
  const { scene } = useThree();
  
  React.useEffect(() => {
    // Create gradient texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d')!;
    
    const gradient = context.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#ffd89b');    // Light golden at top
    gradient.addColorStop(0.7, '#ff8c69');  // Salmon
    gradient.addColorStop(1, '#d2691e');    // Chocolate orange at bottom
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    scene.background = texture;
    
    return () => {
      scene.background = null;
    };
  }, [scene]);
  
  return null;
}

// Generate random positions and properties for clouds in a horizontal plane
function generateCloudData(count: number, width: number, depth: number, heightVariation: number) {
  const clouds = [];
  for (let i = 0; i < count; i++) {
    clouds.push({
      position: {
        x: (Math.random() - 0.5) * width,
        y: -15 + (Math.random() - 0.5) * heightVariation, // Lower the clouds (negative Y)
        z: (Math.random() - 0.5) * depth
      },
      speed: 0.1 + Math.random() * 0.2,
      opacity: 0.3 + Math.random() * 0.2,
      segments: Math.floor(12 + Math.random() * 8),
      bounds: [
        15 + Math.random() * 10, // Much wider clouds
        8 + Math.random() * 4,   // Taller clouds
        12 + Math.random() * 8   // Deeper clouds
      ],
      volume: 12 + Math.random() * 15, // Much denser
      smallestVolume: 0.4 + Math.random() * 0.4
    });
  }
  return clouds;
}

// Generate high wispy clouds with very low opacity
function generateHighClouds(count: number, width: number, depth: number, heightVariation: number) {
  const clouds = [];
  for (let i = 0; i < count; i++) {
    clouds.push({
      position: {
        x: (Math.random() - 0.5) * width,
        y: 5 + (Math.random() - 0.5) * heightVariation, // Higher up (positive Y)
        z: (Math.random() - 0.5) * depth
      },
      speed: 0.05 + Math.random() * 0.1,
      opacity: 0.05 + Math.random() * 0.1, // Very low opacity
      segments: Math.floor(8 + Math.random() * 6),
      bounds: [
        20 + Math.random() * 15, // Even wider
        3 + Math.random() * 2,   // Thinner
        15 + Math.random() * 10  // Longer
      ],
      volume: 4 + Math.random() * 6, // Less dense
      smallestVolume: 0.2 + Math.random() * 0.2
    });
  }
  return clouds;
}

function InfiniteCloudPlane() {
  const group1Ref = useRef<THREE.Group>(null);
  const group2Ref = useRef<THREE.Group>(null);
  const group3Ref = useRef<THREE.Group>(null);
  const highGroup1Ref = useRef<THREE.Group>(null);
  const highGroup2Ref = useRef<THREE.Group>(null);
  const highGroup3Ref = useRef<THREE.Group>(null);
  
  const cloudData1 = useMemo(() => generateCloudData(15, 200, 100, 5), []);
  const cloudData2 = useMemo(() => generateCloudData(15, 200, 100, 5), []);
  const cloudData3 = useMemo(() => generateCloudData(15, 200, 100, 5), []);
  
  // High wispy clouds
  const highCloudData1 = useMemo(() => generateHighClouds(8, 250, 120, 3), []);
  const highCloudData2 = useMemo(() => generateHighClouds(8, 250, 120, 3), []);
  const highCloudData3 = useMemo(() => generateHighClouds(8, 250, 120, 3), []);

  // Create seamless infinite loop with 3 overlapping cloud sections
  useFrame(() => {
    const speed = 0.02; // Slower for background
    const highSpeed = 0.01; // Even slower for high clouds
    const sectionLength = 80;

    // Main clouds
    if (group1Ref.current) {
      group1Ref.current.position.z += speed;
      if (group1Ref.current.position.z > sectionLength) {
        group1Ref.current.position.z = -sectionLength * 2;
      }
    }
    
    if (group2Ref.current) {
      group2Ref.current.position.z += speed;
      if (group2Ref.current.position.z > sectionLength) {
        group2Ref.current.position.z = -sectionLength * 2;
      }
    }
    
    if (group3Ref.current) {
      group3Ref.current.position.z += speed;
      if (group3Ref.current.position.z > sectionLength) {
        group3Ref.current.position.z = -sectionLength * 2;
      }
    }

    // High wispy clouds (slower movement)
    if (highGroup1Ref.current) {
      highGroup1Ref.current.position.z += highSpeed;
      if (highGroup1Ref.current.position.z > sectionLength) {
        highGroup1Ref.current.position.z = -sectionLength * 2;
      }
    }
    
    if (highGroup2Ref.current) {
      highGroup2Ref.current.position.z += highSpeed;
      if (highGroup2Ref.current.position.z > sectionLength) {
        highGroup2Ref.current.position.z = -sectionLength * 2;
      }
    }
    
    if (highGroup3Ref.current) {
      highGroup3Ref.current.position.z += highSpeed;
      if (highGroup3Ref.current.position.z > sectionLength) {
        highGroup3Ref.current.position.z = -sectionLength * 2;
      }
    }
  });

  return (
    <>
      {/* Main cloud sections */}
      <group ref={group1Ref} position={[0, 0, -80]}>
        {cloudData1.map((cloud, i) => (
          <Cloud
            key={`section1-${i}`}
            position={[cloud.position.x, cloud.position.y, cloud.position.z]}
            speed={cloud.speed}
            opacity={cloud.opacity}
            color="white"
            segments={cloud.segments}
            bounds={cloud.bounds}
            volume={cloud.volume}
            smallestVolume={cloud.smallestVolume}
            concentrate="outside"
          />
        ))}
      </group>

      <group ref={group2Ref} position={[0, 0, 0]}>
        {cloudData2.map((cloud, i) => (
          <Cloud
            key={`section2-${i}`}
            position={[cloud.position.x, cloud.position.y, cloud.position.z]}
            speed={cloud.speed}
            opacity={cloud.opacity}
            color="white"
            segments={cloud.segments}
            bounds={cloud.bounds}
            volume={cloud.volume}
            smallestVolume={cloud.smallestVolume}
            concentrate="outside"
          />
        ))}
      </group>

      <group ref={group3Ref} position={[0, 0, 80]}>
        {cloudData3.map((cloud, i) => (
          <Cloud
            key={`section3-${i}`}
            position={[cloud.position.x, cloud.position.y, cloud.position.z]}
            speed={cloud.speed}
            opacity={cloud.opacity}
            color="white"
            segments={cloud.segments}
            bounds={cloud.bounds}
            volume={cloud.volume}
            smallestVolume={cloud.smallestVolume}
            concentrate="outside"
          />
        ))}
      </group>

      {/* High wispy clouds */}
      <group ref={highGroup1Ref} position={[0, 0, -80]}>
        {highCloudData1.map((cloud, i) => (
          <Cloud
            key={`high1-${i}`}
            position={[cloud.position.x, cloud.position.y, cloud.position.z]}
            speed={cloud.speed}
            opacity={cloud.opacity}
            color="white"
            segments={cloud.segments}
            bounds={cloud.bounds}
            volume={cloud.volume}
            smallestVolume={cloud.smallestVolume}
            concentrate="outside"
          />
        ))}
      </group>

      <group ref={highGroup2Ref} position={[0, 0, 0]}>
        {highCloudData2.map((cloud, i) => (
          <Cloud
            key={`high2-${i}`}
            position={[cloud.position.x, cloud.position.y, cloud.position.z]}
            speed={cloud.speed}
            opacity={cloud.opacity}
            color="white"
            segments={cloud.segments}
            bounds={cloud.bounds}
            volume={cloud.volume}
            smallestVolume={cloud.smallestVolume}
            concentrate="outside"
          />
        ))}
      </group>

      <group ref={highGroup3Ref} position={[0, 0, 80]}>
        {highCloudData3.map((cloud, i) => (
          <Cloud
            key={`high3-${i}`}
            position={[cloud.position.x, cloud.position.y, cloud.position.z]}
            speed={cloud.speed}
            opacity={cloud.opacity}
            color="white"
            segments={cloud.segments}
            bounds={cloud.bounds}
            volume={cloud.volume}
            smallestVolume={cloud.smallestVolume}
            concentrate="outside"
          />
        ))}
      </group>
    </>
  );
}

export function SunsetCloudBackground() {
  return (
    <>
      {/* Three.js Canvas */}
      <div style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw', 
        height: '100vh', 
        zIndex: -10,
        background: '#ffd89b'
      }}>
        <Canvas
          camera={{ position: [0, 35, 40], fov: 75 }}
          gl={{ antialias: true }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerOver={(e) => e.stopPropagation()}
          onPointerOut={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
        <SunsetBackground />
        <InfiniteCloudPlane />
        
        <ambientLight intensity={2.0} color="#ffffff" />
        <directionalLight position={[30, 8, 15]} intensity={1.5} color="#ffffff" castShadow />
        <directionalLight position={[-15, 5, -20]} intensity={1.0} color="#fff5e6" />
        <directionalLight position={[5, -3, 8]} intensity={0.6} color="#ffe8cc" />
        
        <OrbitControls
          enabled={false}
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
        />
        </Canvas>
      </div>
      
      {/* Blocking overlay */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -5,
        pointerEvents: 'none',
        background: 'transparent'
      }} />
    </>
  )
}