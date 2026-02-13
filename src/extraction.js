export function stepExtractionProgress({
  progress,
  inside,
  dt,
  duration,
  decayRate,
  outGraceLeft,
  outGraceDuration,
}) {
  const clampedDuration = Math.max(0.01, duration);
  const clampedDt = Math.max(0, dt);
  let nextProgress = progress;
  let nextGraceLeft = outGraceLeft;

  if (inside) {
    nextProgress = Math.min(clampedDuration, nextProgress + clampedDt);
    nextGraceLeft = outGraceDuration;
  } else {
    nextGraceLeft = Math.max(0, nextGraceLeft - clampedDt);
    if (nextGraceLeft <= 0) {
      nextProgress = Math.max(0, nextProgress - clampedDt * decayRate);
    }
  }

  return {
    progress: nextProgress,
    inside,
    outGraceLeft: nextGraceLeft,
  };
}
