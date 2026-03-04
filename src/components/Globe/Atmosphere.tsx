'use client'

import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

const AtmosphereMaterial = shaderMaterial(
  {
    color: new THREE.Color(0x00bbff),
    coefficient: 0.8,
    power: 6.0,
  },
  // Vertex shader
  `
    varying vec3 vNormal;
    varying vec3 vPositionNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform vec3 color;
    uniform float coefficient;
    uniform float power;
    varying vec3 vNormal;
    varying vec3 vPositionNormal;
    void main() {
      float intensity = pow(coefficient + dot(vPositionNormal, vNormal), power);
      gl_FragColor = vec4(color, intensity);
    }
  `
)

extend({ AtmosphereMaterial })

export function Atmosphere() {
  return (
    <mesh scale={[1.12, 1.12, 1.12]}>
      <sphereGeometry args={[1, 64, 64]} />
      {/* @ts-expect-error - custom shader material */}
      <atmosphereMaterial
        transparent
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}
