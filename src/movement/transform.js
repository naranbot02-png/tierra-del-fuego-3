export function intentToWorldDelta({ state, intentX, intentY, dt, speed }) {
  // En plano XZ: +Y intención = avanzar según yaw del jugador.
  const forwardX = Math.sin(state.yaw);
  const forwardZ = -Math.cos(state.yaw);
  const rightX = Math.cos(state.yaw);
  const rightZ = Math.sin(state.yaw);

  return {
    worldX: (rightX * intentX + forwardX * intentY) * speed * dt,
    worldZ: (rightZ * intentX + forwardZ * intentY) * speed * dt,
  };
}
