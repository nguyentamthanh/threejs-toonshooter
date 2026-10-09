import { on } from './events.js';
import { state } from './state.js';

// Procedural audio (Web Audio): no sound files, so nothing to license or download.
const STORAGE_KEY = 'tinyToonDuel_muted';

let ctx = null;
let master = null;
let noiseBuffer = null;
let muted = readMuted();
let musicTimer = null;
let musicStep = 0;
let musicNextTime = 0;

function readMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function ensureContext() {
  if (ctx) return ctx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx = new AudioCtx();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.7;
  master.connect(ctx.destination);
  const length = ctx.sampleRate;
  noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return ctx;
}

function resumeContext() {
  const audio = ensureContext();
  if (audio && audio.state === 'suspended') audio.resume();
}

// ---- building blocks -------------------------------------------------------

function envelope(gainNode, t, peak, attack, decay) {
  gainNode.gain.setValueAtTime(0.0001, t);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function noise({ time = 0, duration = 0.1, volume = 0.5, type = 'bandpass', from = 1500, to = from, q = 1 }) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + time;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(to, 20), t + duration);
  const gain = ctx.createGain();
  envelope(gain, t, volume, 0.004, duration);
  source.connect(filter).connect(gain).connect(master);
  source.start(t);
  source.stop(t + duration + 0.05);
}

function tone({ time = 0, duration = 0.12, volume = 0.3, wave = 'sine', from = 440, to = from }) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + time;
  const osc = ctx.createOscillator();
  osc.type = wave;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(to, 20), t + duration);
  const gain = ctx.createGain();
  envelope(gain, t, volume, 0.005, duration);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

// ---- sound effects ----------------------------------------------------------

const SHOT = {
  pistol: () => {
    noise({ duration: 0.09, volume: 0.5, from: 2400, to: 700, q: 0.8 });
    tone({ duration: 0.1, volume: 0.35, wave: 'triangle', from: 320, to: 80 });
  },
  smg: () => {
    noise({ duration: 0.06, volume: 0.4, from: 3200, to: 1200, q: 1 });
    tone({ duration: 0.07, volume: 0.25, wave: 'square', from: 260, to: 110 });
  },
  shotgun: () => {
    noise({ duration: 0.28, volume: 0.7, type: 'lowpass', from: 2600, to: 220, q: 0.7 });
    tone({ duration: 0.22, volume: 0.5, wave: 'sawtooth', from: 150, to: 40 });
  },
  ak: () => {
    noise({ duration: 0.08, volume: 0.5, from: 2600, to: 900, q: 0.9 });
    tone({ duration: 0.08, volume: 0.3, wave: 'square', from: 200, to: 70 });
  },
  sniper: () => {
    noise({ duration: 0.35, volume: 0.75, type: 'lowpass', from: 5000, to: 300, q: 0.6 });
    tone({ duration: 0.3, volume: 0.45, wave: 'triangle', from: 600, to: 60 });
  },
  rocket: () => {
    noise({ duration: 0.45, volume: 0.6, from: 600, to: 2400, q: 0.7 });
    tone({ duration: 0.25, volume: 0.35, wave: 'sawtooth', from: 90, to: 160 });
  }
};

const SFX = {
  hit: () => {
    noise({ duration: 0.07, volume: 0.35, from: 900, to: 300, q: 1.5 });
    tone({ duration: 0.09, volume: 0.25, wave: 'square', from: 220, to: 90 });
  },
  death: () => {
    tone({ duration: 0.5, volume: 0.35, wave: 'sawtooth', from: 330, to: 55 });
    noise({ duration: 0.35, volume: 0.4, type: 'lowpass', from: 1800, to: 150 });
  },
  explosion: () => {
    noise({ duration: 0.9, volume: 0.9, type: 'lowpass', from: 1400, to: 60, q: 0.5 });
    tone({ duration: 0.7, volume: 0.6, wave: 'sine', from: 110, to: 28 });
  },
  reload: () => {
    noise({ duration: 0.04, volume: 0.3, from: 3500, to: 2500, q: 3 });
    noise({ time: 0.22, duration: 0.05, volume: 0.35, from: 2200, to: 1500, q: 3 });
  },
  dash: () => noise({ duration: 0.22, volume: 0.35, from: 400, to: 3000, q: 1.2 }),
  throw: () => noise({ duration: 0.18, volume: 0.3, from: 700, to: 1800, q: 1 }),
  kick: () => {
    tone({ duration: 0.14, volume: 0.5, wave: 'sine', from: 140, to: 50 });
    noise({ duration: 0.08, volume: 0.3, type: 'lowpass', from: 900, to: 200 });
  },
  coverBreak: () => {
    noise({ duration: 0.4, volume: 0.6, from: 1200, to: 200, q: 0.6 });
    noise({ time: 0.05, duration: 0.25, volume: 0.35, type: 'highpass', from: 3000, to: 1200 });
  },
  pickup: () => {
    tone({ duration: 0.09, volume: 0.25, wave: 'square', from: 660, to: 660 });
    tone({ time: 0.09, duration: 0.14, volume: 0.25, wave: 'square', from: 990, to: 990 });
  },
  roundEnd: () => {
    [523, 659, 784].forEach((f, i) => tone({ time: i * 0.12, duration: 0.2, volume: 0.28, wave: 'triangle', from: f }));
  },
  matchEnd: () => {
    [392, 523, 659, 784, 1047].forEach((f, i) => tone({ time: i * 0.14, duration: 0.3, volume: 0.28, wave: 'triangle', from: f }));
  },
  trap: () => {
    noise({ duration: 0.06, volume: 0.6, type: 'highpass', from: 4000, to: 2500 });
    tone({ duration: 0.12, volume: 0.4, wave: 'square', from: 900, to: 300 });
  }
};

function play(name, ...args) {
  if (muted) return;
  if (!ensureContext()) return;
  const sfx = typeof name === 'function' ? name : SFX[name];
  sfx?.(...args);
}

// ---- music: sparse bass + arp loop while a match is on ------------------------

const BASS = [55, 55, 65.4, 55, 73.4, 55, 65.4, 49];
const STEP = 0.2;

function scheduleMusic() {
  if (!ctx || muted) return;
  while (musicNextTime < ctx.currentTime + 0.4) {
    const idx = musicStep % BASS.length;
    const t = Math.max(0, musicNextTime - ctx.currentTime);
    if (musicStep % 2 === 0) tone({ time: t, duration: 0.18, volume: 0.07, wave: 'triangle', from: BASS[idx] * 2, to: BASS[idx] * 2 });
    if (musicStep % 4 === 2) tone({ time: t, duration: 0.1, volume: 0.035, wave: 'square', from: BASS[idx] * 8 });
    musicStep += 1;
    musicNextTime += STEP;
  }
}

function startMusic() {
  if (musicTimer || !ensureContext()) return;
  musicNextTime = ctx.currentTime + 0.1;
  musicStep = 0;
  musicTimer = setInterval(scheduleMusic, 100);
}

function stopMusic() {
  if (!musicTimer) return;
  clearInterval(musicTimer);
  musicTimer = null;
}

function syncMusicToMode() {
  const active = !muted && (state.mode === 'playing' || state.mode === 'roundIntro');
  if (active) startMusic();
  else stopMusic();
}

// ---- public API ---------------------------------------------------------------

export function setMuted(value) {
  muted = !!value;
  try {
    localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
  } catch {
    // storage unavailable: keep the choice for this session only
  }
  if (master) master.gain.value = muted ? 0 : 0.7;
  syncMusicToMode();
  updateSoundToggleUI();
}

export function toggleMuted() {
  setMuted(!muted);
}

export function onModeChange() {
  syncMusicToMode();
}

function updateSoundToggleUI() {
  const label = document.getElementById('soundToggleLabel');
  if (label) label.textContent = muted ? 'OFF' : 'ON';
}

export function setupAudio() {
  // Browsers only allow audio after a user gesture.
  ['pointerdown', 'keydown'].forEach((type) => window.addEventListener(type, resumeContext, { passive: true }));

  const button = document.getElementById('soundToggle');
  if (button) button.addEventListener('click', (event) => {
    event.currentTarget.blur();
    toggleMuted();
  });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM' && !event.repeat) toggleMuted();
  });
  updateSoundToggleUI();

  on('shot', ({ weaponId }) => play(SHOT[weaponId] || SHOT.pistol));
  on('hit', () => play('hit'));
  on('death', () => play('death'));
  on('explosion', () => play('explosion'));
  on('reload', () => play('reload'));
  on('dash', () => play('dash'));
  on('throw', () => play('throw'));
  on('kick', () => play('kick'));
  on('coverBreak', () => play('coverBreak'));
  on('pickup', () => play('pickup'));
  on('trap', () => play('trap'));
  on('roundEnd', () => play('roundEnd'));
  on('matchEnd', () => play('matchEnd'));
}
