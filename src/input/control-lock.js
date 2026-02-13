export function shouldAutoRunCalibration({ isTouch, calibrated, lockStable }) {
  return Boolean(isTouch && !calibrated && !lockStable);
}
