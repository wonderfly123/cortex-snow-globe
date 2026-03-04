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

// Create a crisp circle texture with a thin soft edge
function createDotTexture(size = 128): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const center = size / 2
  // Hard circle with slight anti-aliased edge
  ctx.beginPath()
  ctx.arc(center, center, center * 0.7, 0, Math.PI * 2)
  ctx.fillStyle = 'white'
  ctx.fill()
  // Thin soft outer glow
  const gradient = ctx.createRadialGradient(center, center, center * 0.65, center, center, center * 0.9)
  gradient.addColorStop(0, 'rgba(255,255,255,0.5)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

// Create glow texture for selection ring
function createGlowTexture(size = 128): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const center = size / 2
  const gradient = ctx.createRadialGradient(center, center, center * 0.3, center, center, center)
  gradient.addColorStop(0, 'rgba(255,170,0,0)')
  gradient.addColorStop(0.5, 'rgba(255,170,0,0.4)')
  gradient.addColorStop(0.7, 'rgba(255,170,0,0.15)')
  gradient.addColorStop(1, 'rgba(255,170,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

// Shared textures (created once)
let dotTexture: THREE.Texture | null = null
let glowTexture: THREE.Texture | null = null

function getDotTexture() {
  if (!dotTexture) dotTexture = createDotTexture()
  return dotTexture
}

function getGlowTexture() {
  if (!glowTexture) glowTexture = createGlowTexture()
  return glowTexture
}

function CityMarker({ city, maxSales }: { city: CityData; maxSales: number }) {
  const [hovered, setHovered] = useState(false)
  const glowRef = useRef<THREE.Sprite>(null)
  const selectCity = useGlobeStore((s) => s.selectCity)
  const setCameraTarget = useGlobeStore((s) => s.setCameraTarget)
  const selectedCity = useGlobeStore((s) => s.selectedCity)

  const isSelected = selectedCity === city.city

  const position = useMemo(
    () => latLonToVec3(city.latitude, city.longitude),
    [city.latitude, city.longitude]
  )

  // Pin size based on revenue
  const pinSize = useMemo(() => {
    const ratio = (city.totalSales || 0) / maxSales
    return 0.03 + ratio * 0.03
  }, [city.totalSales, maxSales])

  const dotMaterial = useMemo(() => {
    return new THREE.SpriteMaterial({
      map: getDotTexture(),
      color: isSelected ? 0xffcc44 : hovered ? 0xffffff : 0xcceeff,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
    })
  }, [isSelected, hovered])

  const glowMaterial = useMemo(() => {
    return new THREE.SpriteMaterial({
      map: getGlowTexture(),
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
      opacity: isSelected ? 0.8 : 0,
    })
  }, [isSelected])

  // Pulse the glow when selected
  useFrame(() => {
    if (glowRef.current && isSelected) {
      const pulse = 1 + Math.sin(Date.now() * 0.004) * 0.15
      glowRef.current.scale.setScalar(pinSize * 2.5 * pulse)
      glowRef.current.material.opacity = 0.5 + Math.sin(Date.now() * 0.004) * 0.3
    }
  })

  const handleClick = useCallback((e: any) => {
    e.stopPropagation()
    selectCity(city.city, city.country)
    setCameraTarget({ lat: city.latitude, lon: city.longitude })
  }, [city, selectCity, setCameraTarget])

  return (
    <group position={position}>
      {/* Selection glow */}
      <sprite
        ref={glowRef}
        material={glowMaterial}
        scale={[pinSize * 2.5, pinSize * 2.5, 1]}
        visible={isSelected}
      />

      {/* Core dot — sprite is always perfectly round */}
      <sprite
        material={dotMaterial}
        scale={[pinSize, pinSize, 1]}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
      />

      {/* Hover tooltip */}
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
