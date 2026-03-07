import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

const Book = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2 + state.clock.elapsedTime * 0.1;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={1.5}>
      <group ref={groupRef}>
        {/* Book cover */}
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[1.6, 2.2, 0.08]} />
          <meshStandardMaterial color="#d97706" roughness={0.3} metalness={0.6} />
        </mesh>
        {/* Pages */}
        <mesh position={[0.05, 0, -0.02]}>
          <boxGeometry args={[1.45, 2.05, 0.12]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.8} />
        </mesh>
        {/* Back cover */}
        <mesh position={[0, 0, -0.11]}>
          <boxGeometry args={[1.6, 2.2, 0.05]} />
          <meshStandardMaterial color="#b45309" roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Spine detail */}
        <mesh position={[-0.82, 0, -0.03]}>
          <boxGeometry args={[0.04, 2.2, 0.24]} />
          <meshStandardMaterial color="#92400e" roughness={0.3} metalness={0.7} />
        </mesh>
      </group>
    </Float>
  );
};

const FloatingOrbs = () => {
  return (
    <>
      {[[-2, 1.5, -2], [2.5, -1, -3], [-1.5, -1.8, -1], [1.8, 2, -2.5]].map((pos, i) => (
        <Float key={i} speed={1.5 + i * 0.3} rotationIntensity={0.5} floatIntensity={2}>
          <mesh position={pos as [number, number, number]}>
            <sphereGeometry args={[0.15 + i * 0.05, 32, 32]} />
            <MeshDistortMaterial
              color={i % 2 === 0 ? "#f59e0b" : "#d97706"}
              roughness={0.1}
              metalness={0.8}
              distort={0.3}
              speed={2}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
};

const FloatingBookScene = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} color="#f59e0b" />
        <directionalLight position={[-3, 2, 4]} intensity={0.5} color="#ffffff" />
        <pointLight position={[0, -3, 2]} intensity={0.3} color="#d97706" />
        <Book />
        <FloatingOrbs />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};

export default FloatingBookScene;
