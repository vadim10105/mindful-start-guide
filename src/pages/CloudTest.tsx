import React, { useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Cloud, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

type TimeOfDay = 'sunrise' | 'day' | 'sunset' | 'night'

// Ease in-out function for smooth transitions
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}


const gradientPresets = {
  sunrise: [
    { stop: 0, color: '#2A3A4A' },    // Dark blue at top
    { stop: 0.3, color: '#3A3F45' },  // Blue-grey transition
    { stop: 0.5, color: '#4A453C' },  // Brown-grey blend
    { stop: 0.7, color: '#5A4F35' },  // Yellowish brown
    { stop: 0.85, color: '#6A593C' }, // Golden brown
    { stop: 1, color: '#7A6343' }     // Rich golden brown at bottom
  ],
  day: [
    { stop: 0, color: '#2C4A6B' },    // Much darker blue at top
    { stop: 0.2, color: '#3C5A7B' },  // Dark blue
    { stop: 0.4, color: '#4C6A8B' },  // Medium dark blue
    { stop: 0.6, color: '#5C7A9B' },  // Medium blue
    { stop: 0.8, color: '#5C7A9B' },  // Keep it darker
    { stop: 1, color: '#4C6A8B' }     // Darker blue at bottom
  ],
  sunset: [
    { stop: 0, color: '#3A4A55' },    // Much darker blue-grey at top
    { stop: 0.2, color: '#5D524F' },  // Dark warm grey
    { stop: 0.4, color: '#6B5A47' },  // Dark taupe
    { stop: 0.6, color: '#7A5A35' },  // Dark golden brown
    { stop: 0.8, color: '#8B4E1C' },  // Dark orange
    { stop: 1, color: '#5A3222' }     // Very dark brown at bottom
  ],
  night: [
    { stop: 0, color: '#000000' },    // Pure black at top
    { stop: 0.2, color: '#010103' },  // Almost pure black
    { stop: 0.4, color: '#010204' },  // Pure black with tiny hint
    { stop: 0.6, color: '#000102' },  // Nearly pure black
    { stop: 0.8, color: '#010103' },  // Almost pure black
    { stop: 1, color: '#000000' }     // Pure black at bottom
  ]
}

function interpolateColor(color1: string, color2: string, factor: number): string {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function SkyBackground({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const { scene } = useThree();
  const [currentColors, setCurrentColors] = React.useState(gradientPresets['sunset']);
  const animationRef = React.useRef<number>();
  
  React.useEffect(() => {
    const startColors = currentColors;
    const endColors = gradientPresets[timeOfDay];
    
    const startTime = Date.now();
    const duration = 1500; // 1.5 seconds to match cloud transition
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const interpolatedColors = startColors.map((start, index) => ({
        stop: start.stop,
        color: interpolateColor(start.color, endColors[index].color, progress)
      }));
      
      setCurrentColors(interpolatedColors);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [timeOfDay]);
  
  React.useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d')!;
    
    const gradient = context.createLinearGradient(0, 0, 0, 256);
    
    currentColors.forEach(({ stop, color }) => {
      gradient.addColorStop(stop, color);
    });
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    scene.background = texture;
    
    return () => {
      scene.background = null;
    };
  }, [scene, currentColors]);
  
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

// Generate static cloud data outside component to prevent regeneration
const staticCloudData1 = generateCloudData(15, 200, 100, 5);
const staticCloudData2 = generateCloudData(15, 200, 100, 5);
const staticCloudData3 = generateCloudData(15, 200, 100, 5);

function InfiniteCloudPlane() {
  const group1Ref = useRef<THREE.Group>(null);
  const group2Ref = useRef<THREE.Group>(null);
  const group3Ref = useRef<THREE.Group>(null);

  // Create seamless infinite loop with 3 overlapping cloud sections
  useFrame(() => {
    const speed = 0.05; // Keep constant speed - no changes during transitions
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
  });

  return (
    <>
      {/* First cloud section */}
      <group ref={group1Ref} position={[0, 0, -80]}>
        {staticCloudData1.map((cloud, i) => (
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

      {/* Second cloud section */}
      <group ref={group2Ref} position={[0, 0, 0]}>
        {staticCloudData2.map((cloud, i) => (
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

      {/* Third cloud section */}
      <group ref={group3Ref} position={[0, 0, 80]}>
        {staticCloudData3.map((cloud, i) => (
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

      {/* High wispy clouds - DISABLED */}
      {/* <group ref={highGroup1Ref} position={[0, 0, -80]}>
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
      </group> */}
    </>
  );
}


function getCurrentTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  
  if (hour >= 5 && hour < 10) return 'sunrise'  // 5am - 10am
  if (hour >= 10 && hour < 17) return 'day'     // 10am - 5pm  
  if (hour >= 17 && hour < 21) return 'sunset'  // 5pm - 9pm
  return 'night'                                 // 9pm - 5am
}

export default function CloudTest() {
  const [timeOfDay, setTimeOfDay] = React.useState<TimeOfDay>(() => getCurrentTimeOfDay())

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TIME_CHANGE') {
        const newTime = event.data.timeOfDay as TimeOfDay
        setTimeOfDay(newTime)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])
  
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      background: '#5E6979'
    }}>
      
      <Canvas
        camera={{ position: [0, 35, 40], fov: 75 }}
        gl={{ antialias: true }}
      >
        <SkyBackground timeOfDay={timeOfDay} />
        <InfiniteCloudPlane key="static-clouds" />
        
        <ambientLight intensity={timeOfDay === 'night' ? 0.5 : 2.0} color="#ffffff" />
        <directionalLight position={[30, 8, 15]} intensity={timeOfDay === 'night' ? 0.2 : 1.5} color="#ffffff" castShadow />
        <directionalLight position={[-15, 5, -20]} intensity={timeOfDay === 'night' ? 0.1 : 1.0} color="#fff5e6" />
        <directionalLight position={[5, -3, 8]} intensity={timeOfDay === 'night' ? 0.05 : 0.6} color="#ffe8cc" />
        
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={false}
          autoRotate={false}
          maxDistance={150}
          minDistance={5}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
          maxAzimuthAngle={0}
          minAzimuthAngle={0}
        />
      </Canvas>
    </div>
  )
}