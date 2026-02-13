import * as THREE from 'https://unpkg.com/three@0.182.0/build/three.module.js';

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const tempForward = new THREE.Vector3();
const tempRight = new THREE.Vector3();

export function intentToWorldDelta({ camera, state, intentX, intentY, dt, speed }) {
  // Base derivada de cámara real para respetar dirección visual del jugador.
  camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
  camera.getWorldDirection(tempForward);
  tempForward.y = 0;
  if (tempForward.lengthSq() > 1e-6) tempForward.normalize();

  tempRight.crossVectors(tempForward, WORLD_UP).normalize();

  return {
    worldX: (tempRight.x * intentX + tempForward.x * intentY) * speed * dt,
    worldZ: (tempRight.z * intentX + tempForward.z * intentY) * speed * dt,
  };
}
