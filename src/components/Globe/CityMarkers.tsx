'use client'

import { useMemo, useState, useCallback } from 'react'
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

  const handleClick = useCallback((e: any) => {
    e.stopPropagation()
    selectCity(city.city, city.country)
    setCameraTarget({ lat: city.latitude, lon: city.longitude })
  }, [city, selectCity, setCameraTarget])

  return (
    <group position={position}>
      {/* Core dot — clickable */}
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
      >
        <sphereGeometry args={[hovered ? scale * 1.5 : scale, 12, 12]} />
        <meshBasicMaterial
          color={hovered ? '#40ffff' : '#00eeff'}
          transparent
          opacity={0.9}
        />
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
