'use client'

import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'

export function Earth() {
  const [colorMap, bumpMap] = useLoader(THREE.TextureLoader, [
    'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg',
  ])

  return (
    <mesh>
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhongMaterial
        map={colorMap}
        bumpMap={bumpMap}
        bumpScale={0.04}
        specular={new THREE.Color(0x3366aa)}
        shininess={20}
      />
    </mesh>
  )
}
