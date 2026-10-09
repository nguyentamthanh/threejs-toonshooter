// Minimal event bus so gameplay code can announce what happened
// (shot, hit, death, explosion...) without knowing who listens (audio, VFX, HUD).
const listeners = new Map();

export function on(type, handler) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(handler);
  return () => listeners.get(type).delete(handler);
}

export function emit(type, payload) {
  const handlers = listeners.get(type);
  if (!handlers) return;
  handlers.forEach((handler) => handler(payload));
}
