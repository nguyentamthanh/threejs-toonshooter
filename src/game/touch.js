import { tryDash, tryKick, tryThrowGrenade } from './actions.js';
import { startReload } from './combat.js';
import { WEAPON_IDS } from './config.js';
import { canUseWeapon, requestWeaponSwitch } from './entities.js';
import { startMatch, togglePause } from './match.js';
import { input, state } from './state.js';
import { getPlayer } from './util.js';

const STICK_RADIUS = 56; // px of drag for full deflection
const FIRE_THRESHOLD = 0.35;
const WEAPON_ORDER = WEAPON_IDS;

let wasFiring = false;

function enableTouchUI() {
  if (input.touch.enabled) return;
  input.touch.enabled = true;
  document.documentElement.classList.add('touch-device');
}

// Floating virtual stick: appears where the finger lands, reports a -1..1 vector
// (x right, y up) through `onChange`.
function bindStick(zone, onChange) {
  const base = zone.querySelector('.stickBase');
  const knob = zone.querySelector('.stickKnob');
  let activeId = null;
  let originX = 0;
  let originY = 0;

  const reset = () => {
    activeId = null;
    base.classList.remove('active');
    knob.style.transform = 'translate(0px, 0px)';
    onChange(0, 0, false);
  };

  zone.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch' || activeId !== null) return;
    enableTouchUI();
    event.preventDefault();
    activeId = event.pointerId;
    zone.setPointerCapture(activeId);
    const rect = zone.getBoundingClientRect();
    originX = event.clientX;
    originY = event.clientY;
    base.style.left = `${originX - rect.left}px`;
    base.style.top = `${originY - rect.top}px`;
    base.classList.add('active');
    onChange(0, 0, true);
  });

  zone.addEventListener('pointermove', (event) => {
    if (event.pointerId !== activeId) return;
    let dx = event.clientX - originX;
    let dy = event.clientY - originY;
    const length = Math.hypot(dx, dy);
    if (length > STICK_RADIUS) {
      dx = (dx / length) * STICK_RADIUS;
      dy = (dy / length) * STICK_RADIUS;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    onChange(dx / STICK_RADIUS, -dy / STICK_RADIUS, true);
  });

  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => {
    zone.addEventListener(type, (event) => {
      if (event.pointerId === activeId) reset();
    });
  });
}

function bindButton(id, action) {
  const button = document.getElementById(id);
  if (!button) return;
  button.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') return;
    enableTouchUI();
    event.preventDefault();
    event.stopPropagation();
    action();
  });
}

function cycleWeapon(player) {
  const index = WEAPON_ORDER.indexOf(player.weapon.id);
  for (let step = 1; step <= WEAPON_ORDER.length; step += 1) {
    const next = WEAPON_ORDER[(index + step) % WEAPON_ORDER.length];
    if (next !== player.weapon.id && canUseWeapon(player, next)) {
      requestWeaponSwitch(player, next);
      return;
    }
  }
}

function whenPlaying(action) {
  return () => {
    if (state.mode !== 'playing') return;
    const player = getPlayer();
    if (player) action(player);
  };
}

export function setupTouch() {
  // Coarse pointer = phone/tablet; also switch on at the first real touch for hybrids.
  if (window.matchMedia('(pointer: coarse)').matches) enableTouchUI();
  window.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') enableTouchUI();
  }, { passive: true });

  const touch = input.touch;
  const moveZone = document.getElementById('touchMoveZone');
  const aimZone = document.getElementById('touchAimZone');
  if (moveZone) bindStick(moveZone, (x, y) => { touch.move.x = x; touch.move.y = y; });
  if (aimZone) {
    bindStick(aimZone, (x, y, active) => {
      touch.aim.x = x;
      touch.aim.y = y;
      touch.aim.active = active;
    });
  }

  bindButton('touchDash', whenPlaying((player) => tryDash(player)));
  bindButton('touchReload', whenPlaying((player) => startReload(player)));
  bindButton('touchGrenade', whenPlaying((player) => tryThrowGrenade(player)));
  bindButton('touchKick', whenPlaying((player) => tryKick(player)));
  bindButton('touchSwap', whenPlaying(cycleWeapon));
  bindButton('touchPause', () => togglePause());

  // Menu buttons double as the touch (and mouse) replacement for the Enter key.
  document.getElementById('startBtn')?.addEventListener('click', () => {
    if (state.mode === 'menu') startMatch();
  });
  document.getElementById('rematchBtn')?.addEventListener('click', () => {
    if (state.mode === 'matchOver') startMatch();
  });
  document.getElementById('resumeBtn')?.addEventListener('click', () => {
    if (state.mode === 'paused') togglePause();
  });

  // Keep the page from scrolling / zooming while playing.
  document.addEventListener('gesturestart', (event) => event.preventDefault());
}

// Called every frame: turns the aim stick into the same "mouse down" signal the
// desktop controls use, so combat code needs no touch-specific branch.
export function updateTouchInput() {
  const { aim } = input.touch;
  const firing = aim.active && Math.hypot(aim.x, aim.y) > FIRE_THRESHOLD;
  if (firing) {
    input.mouse.down = true;
    input.mouse.justPressed = true;
    wasFiring = true;
  } else if (wasFiring) {
    input.mouse.down = false;
    wasFiring = false;
  }
}
