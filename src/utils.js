export function nearest(items, point) {
  return items.reduce((best, item) => {
    const distance = Math.hypot(item.x - point.x, item.y - point.y);
    return !best || distance < best.distance ? { item, distance } : best;
  }, null)?.item;
}

export function clampAngle(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function makeId() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}
