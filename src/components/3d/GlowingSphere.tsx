import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, MeshWobbleMaterial } from "@react-three/drei";
import * as THREE from "three";

const Sphere = ({ color = "#f59e0b", position = [0, 0, 0] as [number, number, number], size = 1 }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.15;
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <Float speed={1.4} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} position={position} scale={size}>
        <icosahedronGeometry args={[1, 8]} />
        <MeshDistortMaterial
          color={color}
          roughness={0.15}
          metalness={0.9}
          distort={0.4}
          speed={1.5}
        />
      </mesh>
    </Float>
  );
};

const Ring = ({ color = "#d97706" }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.3;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[1.8, 0.03, 16, 100]} />
      <meshStandardMaterial color={color} roughness={0.2} metalness={0.9} />
    </mesh>
  );
};

const GlowingSphereScene = ({ className = "", variant = "default" }: { className?: string; variant?: "default" | "auth" | "small" }) => {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={0.8} color="#f59e0b" />
        <pointLight position={[-5, -3, 2]} intensity={0.4} color="#d97706" />
        
        <Sphere color="#f59e0b" size={variant === "small" ? 0.6 : 1} />
        {variant !== "small" && (
          <>
            <Ring />
            <Float speed={2} rotationIntensity={1} floatIntensity={0.5}>
              <mesh position={[2, 1, -2]}>
                <octahedronGeometry args={[0.3]} />
                <MeshWobbleMaterial color="#fbbf24" roughness={0.1} metalness={0.8} factor={0.6} speed={2} />
              </mesh>
            </Float>
            <Float speed={1.5} rotationIntensity={0.8} floatIntensity={1}>
              <mesh position={[-2, -1, -1.5]}>
                <dodecahedronGeometry args={[0.25]} />
                <MeshWobbleMaterial color="#d97706" roughness={0.1} metalness={0.8} factor={0.4} speed={1.5} />
              </mesh>
            </Float>
          </>
        )}
      </Canvas>
    </div>
  );
};

export default GlowingSphereScene;
