// src/components/FloatingLetters.tsx
import React, { useRef, useMemo } from 'react';
import { RigidBody, CollisionEnterEvent } from '@react-three/rapier';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { extend, Object3DNode, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import myfont from '../../public/fonts/helvetiker_regular.typeface.json';

interface FloatingLettersProps {
  letters: string[];
  onBrickDestroyed: (brickId: string) => void;
  onLetterFallen: (letter: string) => void;
}

interface UserData {
  type: string;
  id?: string;
  letter?: string;
}

extend({ TextGeometry });

declare module '@react-three/fiber' {
  interface ThreeElements {
    textGeometry: Object3DNode<TextGeometry, typeof TextGeometry>;
  }
}

const FloatingLetters: React.FC<FloatingLettersProps> = ({ letters, onBrickDestroyed, onLetterFallen }) => {
  const lettersRefs = useRef<RigidBody[]>([]);
  const font = useMemo(() => new FontLoader().parse(myfont), []);

  // Positions initiales des lettres
  const initialPositions = useMemo(() => {
    return letters.map((_, index) => [(index - Math.floor(letters.length / 2)) * 4, 15, 0]); // Ajuster l'espacement
  }, [letters]);

  // Réinitialiser les lettres si elles tombent trop bas
  useFrame(() => {
    lettersRefs.current.forEach((letterRef, index) => {
      const position = letterRef.translation();
      if (position.y < -5) { // Limite de réinitialisation
        const [x, y, z] = initialPositions[index];
        letterRef.setTranslation({ x, y, z }, true);
        letterRef.setLinvel({ x: 0, y: Math.random() * 5 + 5, z: 0 }, true); // Impulsion verticale
        letterRef.setAngvel({ x: Math.random(), y: Math.random(), z: Math.random() }, true); // Rotation aléatoire
      }
    });
  });

  // Gestion des collisions avec les briques
  const handleCollision = (letterId: string) => (event: CollisionEnterEvent) => {
    const otherBody = event.other.rigidBody;
    const userData = otherBody?.userData as UserData | undefined;

    if (userData?.type === 'brick') {
      // Détruire la brique
      onBrickDestroyed(userData.id || '');
    }
  };

  // Créer chaque lettre
  const createLetter = (
    text: string,
    position: [number, number, number],
    rotation: [number, number, number],
    key: string
  ) => {
    return (
      <RigidBody
        key={`visual-letter-${key}`}
        colliders="cuboid"
        restitution={0} // Pas de rebond
        friction={1} // Friction pour réduire les glissements
        mass={1} // Masse plus importante pour plus de gravité
        gravityScale={2} // Gravité normale (ajuster si besoin)
        position={position}
        rotation={rotation}
        userData={{ type: 'visualisationLetter', id: key }}
        ref={(ref) => {
          if (ref && !lettersRefs.current.includes(ref)) {
            lettersRefs.current.push(ref);
          }
        }}
        onCollisionEnter={handleCollision(key)}
      >
        <mesh castShadow receiveShadow>
          <textGeometry args={[text, { font, size: 2.5, depth: 1.3 }]} />
          <meshStandardMaterial color="red" />
        </mesh>
      </RigidBody>
    );
  };

  return (
    <group>
      {letters.map((letter, index) =>
        createLetter(
          letter,
          initialPositions[index] as [number, number, number],
          [0, 0, 0],
          `${letter}-${index}`
        )
      )}
    </group>
  );
};

export default FloatingLetters;