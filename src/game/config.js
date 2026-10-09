import * as THREE from 'three';

    export const BASE_ARENA = {
      width: 26,
      depth: 18,
      bounds: { minX: -13, maxX: 13, minZ: -9, maxZ: 9 },
      ground: { width: 36, depth: 26 }
    };


    export const CONFIG = {
      render: {
        referenceWidth: 1280,
        referenceHeight: 720,
        maxDpr: 2
      },
      arena: {
        width: BASE_ARENA.width,
        depth: BASE_ARENA.depth,
        bounds: { ...BASE_ARENA.bounds }
      },
      camera: {
        fov: 50,
        near: 0.1,
        far: 200,
        position: new THREE.Vector3(0, 22, 18), // More overhead, centered view
        lookAt: new THREE.Vector3(0, 0, 0)
      },
      lighting: {
        ambient: 0.35,
        hemi: 0.65,
        dir: 1.05
      },
      movement: {
        accel: 22,
        maxSpeed: 6.2,
        turnSpeed: THREE.MathUtils.degToRad(900),
        dashSpeed: 12.0,
        dashDuration: 0.12,
        dashCooldown: 1.1
      },
      weaponSwitch: {
        duration: 0.08
      },
      weapons: {
	        pistol: {
	          name: 'Pistol',
	          fireRate: 2.1,
	          fireRateAI: 2.0,
	          damage: 16,
	          magSize: 8,
	          reserveMax: 32,
	          reserveStart: 24,
	          dropChance: 0.4,
	          reload: 0.9,
	          reloadType: 'mag',
	          spreadPlayer: THREE.MathUtils.degToRad(0.7),
	          spreadAI: THREE.MathUtils.degToRad(1.8),
	          range: 34,
	          auto: false,
	          knockback: 0.45,
	          muzzleSize: 0.28,
	          tracer: 0xffd24d
	        },
        smg: {
          name: 'SMG',
          fireRate: 10,
          fireRateAI: 6.0,
          damage: 8,
          magSize: 30,
          reserveMax: 90,
          reserveStart: 0,
          dropChance: 0.35,
          reload: 1.2,
          reloadType: 'mag',
          spreadPlayer: THREE.MathUtils.degToRad(4.0),
          spreadAI: THREE.MathUtils.degToRad(7.0),
          range: 28,
          auto: true,
          knockback: 0.2,
          muzzleSize: 0.34,
          tracer: 0xf7f7ff
        },
        shotgun: {
          name: 'Shotgun',
          fireRate: 1.2,
          fireRateAI: 1.0,
          damage: 12,
          pellets: 6,
          magSize: 4,
          reserveMax: 24,
          reserveStart: 0,
          dropChance: 0.25,
          reload: 0.5,
          reloadType: 'shell',
          spreadPlayer: THREE.MathUtils.degToRad(12),
          spreadAI: THREE.MathUtils.degToRad(14),
          range: 12,
          auto: false,
          knockback: 2.5,
          muzzleSize: 0.46,
          tracer: 0xff8a3d
        }
      },
      nearMissDrama: {
        distance: 0.35,
        cooldown: 3.0,
        timeScale: 0.3,
        duration: 0.5,
        cameraZoom: 1.15
      },
      kick: {
        range: 1.5,
        cooldown: 0.9,
        coverSlideSpeed: 12,
        coverSlideDuration: 0.42,
        coverHitDamage: 20,
        coverHitStun: 0.3,
        barrelRollSpeed: 12,
        barrelRollTime: 2.0
      },
      cover: {
        flashTime: 0.08,
        types: {
          Crate: { hp: 30 },
          CardboardBoxes_1: { hp: 15 },
          CardboardBoxes_2: { hp: 15 },
          CardboardBoxes_3: { hp: 15 },
          CardboardBoxes_4: { hp: 15 },
          Pallet: { hp: 20 },
          Sofa: { hp: 40 }
        }
      },
	      barrel: {
	        hp: 30,
	        radius: 0.65,
	        explosionRadius: 3.6,
	        maxDamage: 55
	      },
	      grenade: {
	        radius: 0.22,
	        throwSpeed: 12.5,
	        throwUp: 8.4,
	        gravity: -18,
	        fuse: 1.05,
	        cooldown: 2.4,
	        ammoMax: 2,
	        ammoStart: 2,
	        explosionRadius: 5.2,
	        maxDamage: 160,
	        knockback: 26.0,
	        stun: 1.35,
	        wallBounce: 0.55,
	        groundBounce: 0.35,
	        drag: 0.06
	      },
	      difficulty: {
	        byMode: { duel: 'easy', deathmatch: 'normal' }, // 'easy' | 'normal' | 'hard'
	        presets: {
	          easy: { aiHp: 80, aiDamageMul: 0.75, aiFireRateMul: 0.82, aiSpreadMul: 1.8, aiThinkBase: 0.62, aiThinkJitter: 0.45 },
	          normal: { aiHp: 100, aiDamageMul: 1.0, aiFireRateMul: 1.0, aiSpreadMul: 1.0, aiThinkBase: 0.35, aiThinkJitter: 0.30 },
	          hard: { aiHp: 110, aiDamageMul: 1.05, aiFireRateMul: 1.12, aiSpreadMul: 0.9, aiThinkBase: 0.26, aiThinkJitter: 0.22 }
	        }
	      },
	      player: {
	        height: 1.75,
	        radius: 0.35,
	        hurtRadius: 0.42 // Larger hitbox makes shooting easier
	      },
      match: {
        totalTime: 105,
        roundsToWin: 3
      },
      pickups: {
        floatHeight: 0.5,
        bobAmount: 0.15,
        bobSpeed: 2.0,
        rotateSpeed: 1.5,
        collectRadius: 1.2,
        crateDropChance: 0.7,
        skyDropInterval: 15,
        skyDropVariance: 5
      },
      gameModes: {
        duel: { name: '1v1 Duel', playerCount: 2, arenaScale: 1.0, aiCount: 1 },
        deathmatch: { name: '4-Player FFA', playerCount: 4, arenaScale: 1.3, aiCount: 3, lives: 3 }
      }
    };


    export const COLORS = {
      dust: 0xC9A36A,
      dustDark: 0x8B6A3E,
      steel: 0x6F7A86,
      p1: 0x45D16E,
      p2: 0xE84C4C,
      p3: 0x4DA3FF,
      p4: 0xF6D64A,
      warning: 0xFFC44D,
      tracer: 0xF7F7FF,
      near: 0x4DE7FF
    };


    export const MODEL_YAW_OFFSET = 0;
 // adjust if character forward differs from -Z
    export const SPAWN_POINTS = [
      new THREE.Vector3(-9, 0, 0),
      new THREE.Vector3(9, 0, 0),
      new THREE.Vector3(0, 0, -7),
      new THREE.Vector3(0, 0, 7)
    ];
