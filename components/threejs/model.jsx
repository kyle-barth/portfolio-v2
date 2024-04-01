/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.2.16 ./public/desk.gltf --transform 
Files: ./public/desk.gltf [3.74MB] > /Users/kylebarth/Documents/projects/portfolio-v2/desk-transformed.glb [171.97KB] (95%)
*/

import React from 'react'
import { useGLTF } from '@react-three/drei'

export function Model(props) {
  const { nodes, materials } = useGLTF('/desk-transformed.glb')
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.Liquid.geometry} material={materials.PaletteMaterial001} position={[14.571, 14.408, 3.147]} rotation={[Math.PI / 2, 0, -2.096]} scale={0.027} />
      <mesh geometry={nodes.Round.geometry} material={materials.PaletteMaterial002} position={[14.571, 14.408, 3.147]} rotation={[Math.PI / 2, 0, -2.096]} scale={0.027} />
      <mesh geometry={nodes['498_Plates'].geometry} material={materials.Mat} position={[19.485, 14.68, 8.185]} rotation={[Math.PI / 2, 0, 0]} scale={0.119} />
      <mesh geometry={nodes.group1745468400.geometry} material={materials.PaletteMaterial003} position={[19.309, 15.546, 8.465]} rotation={[Math.PI / 2, 0, 0]} scale={7.737} />
    </group>
  )
}

useGLTF.preload('/desk-transformed.glb')