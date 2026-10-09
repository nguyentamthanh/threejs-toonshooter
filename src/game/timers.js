import { state } from './state.js';

// Game-flow timers driven by the frame loop, so they stop while paused and can be
// cancelled when a new match starts (unlike setTimeout).
const pending = [];

export function schedule(delaySeconds, callback) {
  pending.push({ remaining: delaySeconds, callback });
}

export function clearScheduled() {
  pending.length = 0;
}

export function updateScheduled(dt) {
  if (state.mode === 'paused') return;
  for (let i = pending.length - 1; i >= 0; i -= 1) {
    const timer = pending[i];
    timer.remaining -= dt;
    if (timer.remaining > 0) continue;
    pending.splice(i, 1);
    timer.callback();
  }
}
