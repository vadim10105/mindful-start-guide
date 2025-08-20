import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// Grass blade geometry and material
const BLADE_WIDTH = 0.06
const BLADE_HEIGHT = 0.3
const BLADE_HEIGHT_VARIATION = 0.1
const BLADE_SEGMENTS = 2
const GRASS_COUNT = 100000 // Dense carpet of grass

function GrassField() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  
  // Create blade geometry with a tapered shape
  const bladeGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(BLADE_WIDTH, BLADE_HEIGHT, 1, BLADE_SEGMENTS)
    
    // Taper the blade to a point at the top
    const positions = geometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      
      // Normalize y from -0.5 to 0.5 => 0 to 1 (bottom to top)
      const normalizedY = (y + BLADE_HEIGHT / 2) / BLADE_HEIGHT
      
      // Taper width from full width at bottom to 0 at top
      const taperFactor = 1 - Math.pow(normalizedY, 1.5) // Power curve for natural taper
      positions.setX(i, x * taperFactor)
      
      // Add slight curve
      const curveX = Math.pow(normalizedY, 2) * 0.15
      positions.setX(i, positions.getX(i) + curveX)
    }
    
    geometry.computeVertexNormals()
    return geometry
  }, [])
  
  // Create instanced mesh data with terrain
  const { dummy, instancedData, colors } = useMemo(() => {
    const dummy = new THREE.Object3D()
    const data = []
    const colorArray = new Float32Array(GRASS_COUNT * 3)
    
    for (let i = 0; i < GRASS_COUNT; i++) {
      // Dense, even distribution for carpet effect
      const x = (Math.random() - 0.5) * 40
      const z = (Math.random() - 0.5) * 40
      
      // Create gentle rolling hills effect
      const hillFrequency = 0.08
      const hillHeight = 4
      const y = Math.sin(x * hillFrequency) * Math.cos(z * hillFrequency) * hillHeight - 2
      
      // Distance from center for density variation
      const distFromCenter = Math.sqrt(x * x + z * z)
      const density = 1
      
      // Minimal height variation for carpet effect
      const heightScale = 0.8 + Math.random() * 0.2
      
      // Vibrant green with subtle variation
      const colorVar = Math.random() * 0.1
      
      const r = 0.35 + colorVar
      const g = 0.75 + colorVar
      const b = 0.25 + colorVar * 0.5
      
      colorArray[i * 3] = r
      colorArray[i * 3 + 1] = g
      colorArray[i * 3 + 2] = b
      
      // Store instance data for animation
      data.push({
        x,
        y,
        z,
        scale: heightScale,
        rotationY: Math.random() * Math.PI * 2,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 0.3 + Math.random() * 0.4,
        swayAmount: 0.02 + Math.random() * 0.03
      })
    }
    
    return { dummy, instancedData: data, colors: colorArray }
  }, [])
  
  // Initialize instances
  useMemo(() => {
    if (!meshRef.current) return
    
    instancedData.forEach((data, i) => {
      dummy.position.set(data.x, data.y, data.z)
      dummy.scale.set(1, data.scale, 1)
      dummy.rotation.y = data.rotationY
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    
    meshRef.current.instanceMatrix.needsUpdate = true
    
    // Set instance colors
    meshRef.current.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colors, 3))
  }, [dummy, instancedData, colors])
  
  // Animate grass swaying
  useFrame((state) => {
    if (!meshRef.current) return
    
    const time = state.clock.elapsedTime
    
    instancedData.forEach((data, i) => {
      const windWave = Math.sin(time * 0.5 + data.x * 0.1) * 0.5 + 0.5
      const swayX = Math.sin(time * data.swaySpeed + data.swayOffset) * data.swayAmount * windWave
      const swayZ = Math.cos(time * data.swaySpeed * 0.7 + data.swayOffset) * data.swayAmount * windWave
      
      dummy.position.set(data.x, data.y, data.z)
      dummy.scale.set(1, data.scale, 1)
      dummy.rotation.set(swayX * 2, data.rotationY, swayZ * 2)
      dummy.updateMatrix()
      
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    
    meshRef.current.instanceMatrix.needsUpdate = true
  })
  
  return (
    <>
      {/* Grass instances */}
      <instancedMesh
        ref={meshRef}
        args={[bladeGeometry, undefined, GRASS_COUNT]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial 
          vertexColors
          emissive="#5c9e31"
          emissiveIntensity={0.2}
          roughness={0.9}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      
      {/* Smooth rolling hills ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[60, 60, 32, 32]} />
        <meshStandardMaterial color="#4a8f2d" roughness={0.8}>
          <primitive 
            attach="onBeforeCompile"
            object={(shader: any) => {
              shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                  vec3 transformed = position;
                  float hillFrequency = 0.08;
                  float hillHeight = 4.0;
                  transformed.z = sin(position.x * hillFrequency) * cos(position.y * hillFrequency) * hillHeight;
                  #include <begin_vertex>
                `
              )
            }}
          />
        </meshStandardMaterial>
      </mesh>
    </>
  )
}

export default function GrassTest() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#87CEEB' }}>
      <Canvas
        camera={{ position: [0, 5, 20], fov: 60 }}
        gl={{ antialias: true, shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap } }}
      >
        {/* Sky color */}
        <color attach="background" args={['#87CEEB']} />
        <fog attach="fog" args={['#87CEEB', 10, 50]} />
        
        {/* Lighting */}
        <ambientLight intensity={1.0} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />
        <directionalLight
          position={[-5, 8, -5]}
          intensity={0.7}
          color="#ffe4b5"
        />
        <hemisphereLight 
          intensity={0.5}
          groundColor="#3d7c47"
          color="#87CEEB"
        />
        
        {/* Grass field */}
        <GrassField />
        
        {/* Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI * 0.8}
          minDistance={5}
          maxDistance={50}
        />
      </Canvas>
      
      {/* Info overlay */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        color: 'white',
        background: 'rgba(0,0,0,0.5)',
        padding: '10px',
        borderRadius: '5px',
        fontFamily: 'monospace'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Grass Test Scene</h3>
        <p style={{ margin: '0' }}>Instances: {GRASS_COUNT}</p>
        <p style={{ margin: '0' }}>Use mouse to orbit camera</p>
      </div>
    </div>
  )
}