import * as THREE from 'three';
import { CONFIG } from './config.js';

    export const input = {
      keys: {},
      mouse: { x: 0, y: 0, down: false, justPressed: false },
      // Virtual sticks, -1..1 with y up. Filled in by touch.js.
      touch: { enabled: false, usingMouse: false, move: { x: 0, y: 0 }, aim: { active: false, x: 0, y: 0 } }
    };


    export const hudPanels = new Map();


    export const raycaster = new THREE.Raycaster();

    export const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);


	    export const state = {
	      mode: 'loading',
	      gameMode: 'duel',
	      activeGameMode: null,
      showLeaderboard: false,
      timeLeft: CONFIG.match.totalTime,
      round: 1,
      wins: { p1: 0, p2: 0 },
      roundResults: [],
      lives: {},
      bestWinTime: null,
      matchStartTime: null,
      suddenDeath: false,
      roundEnding: false,
      matchEnded: false,
      lastKill: null,
	      killCam: null
	    };


	    export const settings = {
	      usePlaceholders: false,
	      playerSkin: readStored('tinyToonDuel_skin') || 'soldier'
	    };


	    // Selected arena (see maps.js); applied when the arena is (re)built.
	    state.mapId = readStored('tinyToonDuel_map') || 'yard';


	    export function readStored(key) {
	      try {
	        return localStorage.getItem(key);
	      } catch {
	        return null;
	      }
	    }


	    export function writeStored(key, value) {
	      try {
	        localStorage.setItem(key, value);
	      } catch {
	        // storage blocked (private mode): keep the choice for this session only
	      }
	    }


	    export const storedVisualMode = readStored('tinyToonDuel_visualMode');

	    if (storedVisualMode === 'placeholder') {
	      settings.usePlaceholders = true;
	    }


	    export const fx = {
	      shakeTime: 0,
	      shakeIntensity: 0,
      fovPulse: 0,
      fovVelocity: 0,
      hitFlashTimer: 0,
      nearMissTimer: 0,
      dramaticTimer: 0,
      dramaticTeam: null,
      timeScale: 1,
      timeScaleTimer: 0,
      hitstopTimer: 0
    };


    export const assets = {
      cache: new Map(),
      manifest: null
    };


		    export const world = {
		      scene: new THREE.Scene(),
		      camera: null,
		      renderer: null,
	      clock: new THREE.Clock(),
	      mixers: [],
	      entities: [],
	      cover: [],
	      barrels: [],
	      spilledBarrels: [], // Track spilled barrel meshes for cleanup
	      grenades: [],
	      pickups: [],
	      hazards: [],
	      fallingCrates: [],
	      skyDropTimer: 0,
	      arenaObjects: [],
	      nodes: [],
      fxLines: [],
      fxSprites: [],
      fxParticles: [], // Hit effect particles
      popups: [],
      cameraState: null,
	      reticle: null,
	      gunMuzzleFlashes: [],
	      arenaLayout: null,
	      arenaDecor: []
	    };


	    export const stored = readStored('tinyToonDuel_bestWinSeconds');

	    if (stored) {
	      const parsed = Number(stored);
	      if (!Number.isNaN(parsed)) state.bestWinTime = parsed;
	    }


	    export const storedDifficulty = readStored('tinyToonDuel_aiDifficultyByMode');

	    if (storedDifficulty) {
	      try {
	        const parsed = JSON.parse(storedDifficulty);
	        if (parsed && typeof parsed === 'object') {
	          CONFIG.difficulty.byMode = { ...CONFIG.difficulty.byMode, ...parsed };
	        }
	      } catch {}
	    }
