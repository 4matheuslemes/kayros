export function lightTap() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(12); // vibração curta e sutil, ~12ms
  }
}
