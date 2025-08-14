import React, { useMemo, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Cloud } from '@react-three/drei'
import * as THREE from 'three'

function SunsetBackground() {
  const { scene } = useThree();
  
  useEffect(() => {
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

// Simplified static clouds (no animation to avoid useFrame issues)
function StaticClouds() {
  const cloudData = useMemo(() => {
    const clouds = [];
    for (let i = 0; i < 20; i++) {
      clouds.push({
        position: [
          (Math.random() - 0.5) * 100,
          -15 + (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 60
        ],
        opacity: 0.2 + Math.random() * 0.3,
        bounds: [8 + Math.random() * 8, 4 + Math.random() * 3, 8 + Math.random() * 6]
      });
    }
    return clouds;
  }, []);

  return (
    <>
      {cloudData.map((cloud, i) => (
        <Cloud
          key={i}
          position={cloud.position}
          opacity={cloud.opacity}
          color="white"
          segments={12}
          bounds={cloud.bounds}
          volume={8}
          smallestVolume={0.3}
          concentrate="outside"
        />
      ))}
    </>
  );
}

export function IsolatedCloudBackground() {
  useEffect(() => {
    // Completely block all events on the canvas container
    const handleEvent = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    const container = document.getElementById('cloud-background-container');
    if (container) {
      const events = ['click', 'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'wheel', 'touchstart', 'touchmove', 'touchend'];
      events.forEach(eventType => {
        container.addEventListener(eventType, handleEvent, { capture: true, passive: false });
      });

      return () => {
        events.forEach(eventType => {
          container.removeEventListener(eventType, handleEvent, { capture: true });
        });
      };
    }
  }, []);

  return (
    <div
      id="cloud-background-container"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -10,
        background: '#ffd89b',
        pointerEvents: 'none',
        userSelect: 'none'
      }}
    >
      <Canvas
        camera={{ position: [0, 35, 40], fov: 75 }}
        gl={{ antialias: true }}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          display: 'block'
        }}
      >
        <SunsetBackground />
        <StaticClouds />
        
        <ambientLight intensity={2.0} color="#ffffff" />
        <directionalLight position={[30, 8, 15]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[-15, 5, -20]} intensity={1.0} color="#fff5e6" />
        <directionalLight position={[5, -3, 8]} intensity={0.6} color="#ffe8cc" />
      </Canvas>
    </div>
  )
}