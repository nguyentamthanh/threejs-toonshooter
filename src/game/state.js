import * as THREE from 'three';
import { CONFIG } from './config.js';

    export const input = {
      keys: {},
      mouse: { x: 0, y: 0, down: false, justPressed: false }
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
	      usePlaceholders: false
	    };


	    export const storedVisualMode = localStorage.getItem('tinyToonDuel_visualMode');

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


	    export const stored = localStorage.getItem('tinyToonDuel_bestWinSeconds');

	    if (stored) {
	      const parsed = Number(stored);
	      if (!Number.isNaN(parsed)) state.bestWinTime = parsed;
	    }


	    export const storedDifficulty = localStorage.getItem('tinyToonDuel_aiDifficultyByMode');

	    if (storedDifficulty) {
	      try {
	        const parsed = JSON.parse(storedDifficulty);
	        if (parsed && typeof parsed === 'object') {
	          CONFIG.difficulty.byMode = { ...CONFIG.difficulty.byMode, ...parsed };
	        }
	      } catch {}
	    }
