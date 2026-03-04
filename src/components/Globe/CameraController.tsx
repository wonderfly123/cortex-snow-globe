'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGlobeStore } from '@/lib/store'

function latLonToPosition(lat: number, lon: number, distance: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -distance * Math.sin(phi) * Math.cos(theta),
    distance * Math.cos(phi),
    distance * Math.sin(phi) * Math.sin(theta)
  )
}

export function CameraController({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const { camera } = useThree()
  const cameraTarget = useGlobeStore((s) => s.cameraTarget)
  const selectedCity = useGlobeStore((s) => s.selectedCity)

  const targetPosition = useRef<THREE.Vector3 | null>(null)
  const isAnimating = useRef(false)
  const defaultPosition = useRef(new THREE.Vector3(0, 0, 3.2))

  useEffect(() => {
    if (cameraTarget) {
      targetPosition.current = latLonToPosition(cameraTarget.lat, cameraTarget.lon, 2.2)
      isAnimating.current = true
      if (controlsRef.current) {
        controlsRef.current.autoRotate = false
      }
    } else if (!selectedCity) {
      targetPosition.current = defaultPosition.current.clone()
      isAnimating.current = true
      if (controlsRef.current) {
        controlsRef.current.autoRotate = true
      }
    }
  }, [cameraTarget, selectedCity, controlsRef])

  useFrame(() => {
    if (!isAnimating.current || !targetPosition.current) return

    // Disable controls during animation to prevent fighting
    if (controlsRef.current) {
      controlsRef.current.enabled = false
    }

    camera.position.lerp(targetPosition.current, 0.05)
    camera.lookAt(0, 0, 0)

    const distance = camera.position.distanceTo(targetPosition.current)
    if (distance < 0.02) {
      isAnimating.current = false
      // Re-enable controls after animation completes
      if (controlsRef.current) {
        controlsRef.current.enabled = true
        controlsRef.current.target.set(0, 0, 0)
        controlsRef.current.update()
      }
    }
  })

  return null
}
