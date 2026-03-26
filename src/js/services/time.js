// Tiny helpers to keep UI/services readable.
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatDuration(durationMs) {
  // Keep formatting simple: show minutes only when needed.
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes} min ${seconds} sec`;
  }

  return `${seconds} sec`;
}
