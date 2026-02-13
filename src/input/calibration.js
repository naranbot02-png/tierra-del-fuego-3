export function resolveCalibrationResult({ avgX, avgY, countX, countY, prev = { invertX: false, invertY: false }, minSamples = 5, deadzone = 0.2 }) {
  let invertX = prev.invertX;
  let invertY = prev.invertY;

  if (countX >= minSamples && Math.abs(avgX) >= deadzone) {
    // Esperado para "mover derecha": avgX > 0
    invertX = avgX < 0;
  }

  if (countY >= minSamples && Math.abs(avgY) >= deadzone) {
    // Esperado para "mover arriba": avgY < 0 (por coordenada pantalla)
    invertY = avgY > 0;
  }

  return { invertX, invertY };
}
