'use client';
import './index.css';
import * as THREE from 'three';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, extend, useThree, useFrame } from '@react-three/fiber';
import {
  useGLTF,
  useTexture,
  Environment,
  Lightformer,
} from '@react-three/drei';
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
} from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';

extend({ MeshLineGeometry, MeshLineMaterial });

const GLTF_PATH = '/assets/kartu.glb';
const TEXTURE_PATH = '/assets/bandd.png';

// Position initiale tendue vers le haut/droite.
// Chaque segment garde exactement une longueur de 1 : aucun "coup de fouet"
// artificiel n'est créé par une contrainte déjà violée au démarrage.
const PENDULUM_LINK_X = 0.78;
const PENDULUM_LINK_Y = -Math.sqrt(1 - PENDULUM_LINK_X ** 2);
const DRAG_UNLOCK_MS = 1350;

useGLTF.preload(GLTF_PATH);
useTexture.preload(TEXTURE_PATH);

export default function App({
  onDragChange,
  onReady,
  startEntrance = false,
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [isCanvasActive, setIsCanvasActive] = useState(true);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCanvasActive(entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: '120px 0px 120px 0px',
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="responsive-wrapper"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <Canvas
        frameloop={isCanvasActive ? 'always' : 'never'}
        dpr={[1, 1.2]}
        gl={{
          alpha: true,
          antialias: false,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [0, 0, 13], fov: 25 }}
        style={{
          background: 'transparent',
          width: '100%',
          height: '100%',
          pointerEvents: isMobile ? 'none' : 'auto',
        }}
      >
        <ambientLight intensity={Math.PI} />

        <Scene
          isMobile={isMobile}
          onDragChange={onDragChange}
          onReady={onReady}
          startEntrance={startEntrance}
        />

        <Environment blur={0.75}>
          <Lightformer
            intensity={2}
            color="white"
            position={[0, -1, 5]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[-1, -1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[1, 1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={10}
            color="white"
            position={[-10, 0, 14]}
            rotation={[0, Math.PI / 2, Math.PI / 3]}
            scale={[100, 10, 1]}
          />
        </Environment>
      </Canvas>
    </div>
  );
}

function Scene({ isMobile, onDragChange, onReady, startEntrance }) {
  return (
    <Physics
      key={isMobile ? 'mobile' : 'desktop'}
      interpolate
      gravity={[0, -40, 0]}
      timeStep={1 / 60}
    >
      {!isMobile && (
        <Band
          isMobile={isMobile}
          onDragChange={onDragChange}
          onReady={onReady}
          startEntrance={startEntrance}
        />
      )}
    </Physics>
  );
}

function Band({
  isMobile,
  onDragChange,
  onReady,
  startEntrance,
  maxSpeed = 50,
  minSpeed = 10,
}) {
  const band = useRef();
  const fixed = useRef();
  const j1 = useRef();
  const j2 = useRef();
  const j3 = useRef();
  const card = useRef();
  const readySent = useRef(false);
  const releaseHandled = useRef(false);
  const wasDragged = useRef(false);

  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();

  // Un peu moins amorti que V2 pendant la vie normale du pendule :
  // assez libre pour 2-4 oscillations visibles, mais suffisamment amorti
  // pour revenir naturellement au repos.
  const segmentProps = {
    type: 'dynamic',
    canSleep: true,
    colliders: false,
    angularDamping: 2.8,
    linearDamping: 2.4,
  };

  const { nodes, materials } = useGLTF(GLTF_PATH);
  const sourceTexture = useTexture(TEXTURE_PATH);
  const texture = useMemo(() => {
    const clonedTexture = sourceTexture.clone();
    clonedTexture.wrapS = THREE.RepeatWrapping;
    clonedTexture.wrapT = THREE.RepeatWrapping;
    clonedTexture.needsUpdate = true;
    return clonedTexture;
  }, [sourceTexture]);
  const { width, height } = useThree((state) => state.size);

  const [curve] = useState(() => {
    const nextCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    nextCurve.curveType = 'chordal';
    return nextCurve;
  });

  const [dragged, drag] = useState(false);
  const [hovered, hover] = useState(false);
  const [entranceComplete, setEntranceComplete] = useState(false);
  const canDrag = !isMobile && entranceComplete;

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.45, 0]]);

  useEffect(() => {
    if (!startEntrance) {
      releaseHandled.current = false;
      return undefined;
    }

    [j1, j2, j3, card].forEach((ref) => ref.current?.wakeUp());

    const timer = window.setTimeout(() => {
      setEntranceComplete(true);
    }, DRAG_UNLOCK_MS);

    return () => window.clearTimeout(timer);
  }, [startEntrance]);

  useEffect(() => {
    if (hovered && canDrag) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab';
      return () => (document.body.style.cursor = 'auto');
    }
  }, [hovered, dragged, canDrag]);

  useEffect(() => {
    return () => onDragChange?.(false);
  }, [onDragChange]);

  useFrame((state, delta) => {
    if (!readySent.current) {
      readySent.current = true;
      onReady?.();
    }

    // Au moment exact où le landing a fini de sortir, les corps passent de
    // cinématiques à dynamiques. Ils sont déjà positionnés comme une corde
    // tendue en diagonale vers la droite : la gravité suffit donc à générer
    // une vraie trajectoire pendulaire, sans téléportation ni impulsion forcée.
    if (
      startEntrance &&
      !releaseHandled.current &&
      j1.current &&
      j2.current &&
      j3.current &&
      card.current
    ) {
      releaseHandled.current = true;

      [j1, j2, j3, card].forEach((ref) => {
        ref.current.wakeUp();
        ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      });
    }

    // Au relachement du drag, Rapier peut conserver une vitesse importante
    // issue du mouvement cinematique de la carte et des segments de corde.
    // On annule cette energie residuelle une seule fois APRES que la carte
    // soit repassee en corps dynamique. La gravite conserve ensuite un
    // balancement naturel depuis la position relachee, sans vibration rapide.
    if (dragged) {
      wasDragged.current = true;
    } else if (
      wasDragged.current &&
      j1.current &&
      j2.current &&
      j3.current &&
      card.current
    ) {
      wasDragged.current = false;

      [j1, j2, j3, card].forEach((ref) => {
        ref.current.wakeUp();
        ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      });

      // Synchronise aussi la courbe visuelle avec les corps physiques pour
      // eviter un rattrapage gauche/droite de MeshLine apres un drag rapide.
      [j1, j2].forEach((ref) => {
        if (ref.current.lerped) {
          ref.current.lerped.copy(ref.current.translation());
        }
      });
    }

    if (dragged && card.current && canDrag) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));

      [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());

      const newX = vec.x - dragged.x;
      let newY = vec.y - dragged.y;
      const newZ = vec.z - dragged.z;

      const screenY = state.pointer.y;
      const limit = isMobile ? -0.1 : -0.2;

      if (screenY < limit) newY = card.current.translation().y;

      card.current.setNextKinematicTranslation({ x: newX, y: newY, z: newZ });
    }

    if (fixed.current && j1.current && j2.current && j3.current && card.current) {
      [j1, j2].forEach((ref) => {
        if (!ref.current.lerped) {
          ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
        }

        const d = Math.max(
          0.1,
          Math.min(1, ref.current.lerped.distanceTo(ref.current.translation()))
        );

        const interpolation = Math.min(
          1,
          delta * (minSpeed + d * (maxSpeed - minSpeed))
        );

        ref.current.lerped.lerp(
          ref.current.translation(),
          interpolation
        );
      });

      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.lerped);
      curve.points[2].copy(j1.current.lerped);
      curve.points[3].copy(fixed.current.translation());

      if (band.current?.geometry) {
        band.current.geometry.setPoints(curve.getPoints(32));
      }

      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());

      card.current.setAngvel({
        x: ang.x,
        y: ang.y - rot.y * 0.25,
        z: ang.z,
      });
    }
  });

  const j1Start = [PENDULUM_LINK_X, PENDULUM_LINK_Y, 0];
  const j2Start = [PENDULUM_LINK_X * 2, PENDULUM_LINK_Y * 2, 0];
  const j3Start = [PENDULUM_LINK_X * 3, PENDULUM_LINK_Y * 3, 0];
  const cardStart = [
    PENDULUM_LINK_X * 3,
    PENDULUM_LINK_Y * 3 - 1.45,
    0,
  ];

  return (
    <>
      <group position={[3, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />

        <RigidBody
          position={j1Start}
          ref={j1}
          {...segmentProps}
          type={startEntrance ? 'dynamic' : 'kinematicPosition'}
        >
          <BallCollider args={[0.1]} />
        </RigidBody>

        <RigidBody
          position={j2Start}
          ref={j2}
          {...segmentProps}
          type={startEntrance ? 'dynamic' : 'kinematicPosition'}
        >
          <BallCollider args={[0.1]} />
        </RigidBody>

        <RigidBody
          position={j3Start}
          ref={j3}
          {...segmentProps}
          type={startEntrance ? 'dynamic' : 'kinematicPosition'}
        >
          <BallCollider args={[0.1]} />
        </RigidBody>

        <RigidBody
          position={cardStart}
          ref={card}
          {...segmentProps}
          type={
            dragged
              ? 'kinematicPosition'
              : startEntrance
                ? 'dynamic'
                : 'kinematicPosition'
          }
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />

          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => canDrag && hover(true)}
            onPointerOut={() => canDrag && hover(false)}
            onPointerUp={(e) => {
              if (!canDrag) return;
              e.target.releasePointerCapture(e.pointerId);
              drag(false);
              onDragChange?.(false);
            }}
            onPointerCancel={() => {
              drag(false);
              onDragChange?.(false);
            }}
            onPointerDown={(e) => {
              if (!canDrag) return;
              e.target.setPointerCapture(e.pointerId);
              onDragChange?.(true);
              drag(
                new THREE.Vector3()
                  .copy(e.point)
                  .sub(vec.copy(card.current.translation()))
              );
            }}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial {...materials.base} />
            </mesh>
            <mesh geometry={nodes.clip.geometry} material={materials.metal} />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>

      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          transparent
          opacity={0.9}
          color="white"
          depthTest={false}
          resolution={[width, height]}
          useMap
          map={texture}
          repeat={[-4, 1]}
          lineWidth={1}
        />
      </mesh>
    </>
  );
}
