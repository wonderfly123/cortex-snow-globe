'use client'

import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Earth } from './Earth'
import { Atmosphere } from './Atmosphere'
import { CityMarkers } from './CityMarkers'

function Scene() {
  const controlsRef = useRef(null)

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} color="#334466" />
      <directionalLight position={[4, 2, 3]} intensity={2.0} color="#fff5e0" />
      <directionalLight position={[-4, -1, -3]} intensity={0.3} color="#2244aa" />

      {/* Stars background */}
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

      {/* Globe */}
      <group>
        <Earth />
        <Atmosphere />
        <CityMarkers />
      </group>

      {/* Controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={true}
        minDistance={1.8}
        maxDistance={6}
        autoRotate
        autoRotateSpeed={0.5}
        enableDamping
        dampingFactor={0.05}
      />

      {/* Postprocessing */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.8}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.8} />
      </EffectComposer>
    </>
  )
}

export function Globe() {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.2], fov: 42 }}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0a0a1a')
      }}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
