export const MOBILE_AUTO_SPRINT_THRESHOLD = 0.92;

export function getKeyboardIntentAxes(keys) {
  let x = 0;
  let y = 0;
  if (keys.has('KeyA')) x -= 1;
  if (keys.has('KeyD')) x += 1;
  if (keys.has('KeyW')) y += 1;
  if (keys.has('KeyS')) y -= 1;
  return { x, y };
}

export function getTouchIntentAxes(touch) {
  // Stick Y UI: arriba es negativo. Convención de intención: +Y avanza.
  return {
    x: touch.moveX,
    y: -touch.moveY,
  };
}

export function normalizeIntentAxes(...sources) {
  let x = 0;
  let y = 0;

  for (const source of sources) {
    x += source.x;
    y += source.y;
  }

  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }

  return { x, y };
}

export function isKeyboardSprinting(keys, missionPhase) {
  return missionPhase === 'playing' && (keys.has('ShiftLeft') || keys.has('ShiftRight'));
}

export function isTouchAutoSprinting({ isTouch, missionPhase, intentX, intentY, threshold = MOBILE_AUTO_SPRINT_THRESHOLD }) {
  if (!isTouch || missionPhase !== 'playing') return false;
  return Math.hypot(intentX, intentY) >= threshold;
}
