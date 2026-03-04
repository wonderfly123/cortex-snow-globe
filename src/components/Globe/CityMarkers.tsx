'use client'

import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useGlobeStore, CityData } from '@/lib/store'

function latLonToVec3(lat: number, lon: number, radius = 1.02): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

function CityMarker({ city, maxSales }: { city: CityData; maxSales: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const selectCity = useGlobeStore((s) => s.selectCity)
  const setCameraTarget = useGlobeStore((s) => s.setCameraTarget)

  const position = useMemo(
    () => latLonToVec3(city.latitude, city.longitude),
    [city.latitude, city.longitude]
  )

  const scale = useMemo(() => {
    const ratio = (city.totalSales || 0) / maxSales
    return 0.015 + ratio * 0.03
  }, [city.totalSales, maxSales])

  useFrame(() => {
    if (meshRef.current && hovered) {
      meshRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.3)
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1)
    }
  })

  const handleClick = (e: any) => {
    e.stopPropagation()
    selectCity(city.city, city.country)
    setCameraTarget({ lat: city.latitude, lon: city.longitude })
  }

  return (
    <group position={position}>
      {/* Glow ring */}
      <mesh>
        <ringGeometry args={[scale * 2, scale * 3.5, 32]} />
        <meshBasicMaterial
          color="#00eeff"
          transparent
          opacity={hovered ? 0.5 : 0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Core dot */}
      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
      >
        <sphereGeometry args={[scale, 16, 16]} />
        <meshBasicMaterial color="#00eeff" />
      </mesh>

      {/* Hover tooltip */}
      {hovered && (
        <Html distanceFactor={8} center style={{ pointerEvents: 'none' }}>
          <div className="glass rounded-lg px-3 py-1.5 whitespace-nowrap text-sm font-medium text-white">
            {city.city}
          </div>
        </Html>
      )}
    </group>
  )
}

export function CityMarkers() {
  const cities = useGlobeStore((s) => s.cities)

  const maxSales = useMemo(
    () => Math.max(...cities.map((c) => c.totalSales || 0), 1),
    [cities]
  )

  if (cities.length === 0) return null

  return (
    <group>
      {cities.map((city) => (
        <CityMarker key={`${city.city}-${city.country}`} city={city} maxSales={maxSales} />
      ))}
    </group>
  )
}
