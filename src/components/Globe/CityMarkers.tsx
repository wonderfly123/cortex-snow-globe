'use client'

import { useRef, useMemo, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useGlobeStore, CityData } from '@/lib/store'

function latLonToVec3(lat: number, lon: number, radius = 1.015): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

function CityMarker({ city, maxSales }: { city: CityData; maxSales: number }) {
  const [hovered, setHovered] = useState(false)
  const glowRef = useRef<THREE.Mesh>(null)
  const selectCity = useGlobeStore((s) => s.selectCity)
  const setCameraTarget = useGlobeStore((s) => s.setCameraTarget)
  const selectedCity = useGlobeStore((s) => s.selectedCity)

  const isSelected = selectedCity === city.city

  const position = useMemo(
    () => latLonToVec3(city.latitude, city.longitude),
    [city.latitude, city.longitude]
  )

  // Small pin size: 0.006 to 0.012 based on revenue
  const pinSize = useMemo(() => {
    const ratio = (city.totalSales || 0) / maxSales
    return 0.006 + ratio * 0.006
  }, [city.totalSales, maxSales])

  // Pulse the glow ring when selected
  useFrame(() => {
    if (glowRef.current && isSelected) {
      const s = 1 + Math.sin(Date.now() * 0.004) * 0.3
      glowRef.current.scale.setScalar(s)
    }
  })

  const handleClick = useCallback((e: any) => {
    e.stopPropagation()
    selectCity(city.city, city.country)
    setCameraTarget({ lat: city.latitude, lon: city.longitude })
  }, [city, selectCity, setCameraTarget])

  return (
    <group position={position}>
      {/* Glow halo — subtle, visible on unselected; pulsing on selected */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[isSelected ? pinSize * 4 : pinSize * 2, 12, 12]} />
        <meshBasicMaterial
          color={isSelected ? '#ffaa00' : '#00eeff'}
          transparent
          opacity={isSelected ? 0.35 : 0.15}
          depthWrite={false}
        />
      </mesh>

      {/* Core pin — bright white dot */}
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
      >
        <sphereGeometry args={[pinSize, 8, 8]} />
        <meshBasicMaterial
          color={isSelected ? '#ffcc44' : hovered ? '#ffffff' : '#e0f0ff'}
        />
      </mesh>

      {/* Hover tooltip — fixed screen size */}
      {hovered && !isSelected && (
        <Html center style={{ pointerEvents: 'none', transform: 'translateY(-16px)' }}>
          <div className="glass rounded px-2 py-0.5 whitespace-nowrap text-[10px] font-medium text-white">
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
