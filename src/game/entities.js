import * as THREE from 'three';
import { cloneAsset, findBuiltInWeapons, normalizeToHeight } from './assets.js';
import { COLORS, CONFIG, SPAWN_POINTS } from './config.js';
import { createSprite } from './fx.js';
import { getActiveGameMode } from './menu.js';
import { assets, fx, state, world } from './state.js';

    export function spawnEntities() {
      const manifest = assets.manifest.assets.toonshooter;
      const playerPath = manifest.characters.Character_Soldier;
      const enemyPath = manifest.characters.Character_Enemy;
      const guns = {
        pistol: manifest.guns.Pistol,
        smg: manifest.guns.SMG,
        shotgun: manifest.guns.Shotgun
      };
      const mode = getActiveGameMode();
      const spawnPoints = getSpawnPoints(mode.playerCount);
      const roster = [
        { id: 'p1', name: 'Player 1 (Green)', team: 'p1', color: COLORS.p1, path: playerPath, isPlayer: true },
        { id: 'p2', name: 'Player 2 (Red)', team: 'p2', color: COLORS.p2, path: enemyPath, isPlayer: false },
        { id: 'p3', name: 'Player 3 (Blue)', team: 'p3', color: COLORS.p3, path: enemyPath, isPlayer: false },
        { id: 'p4', name: 'Player 4 (Gold)', team: 'p4', color: COLORS.p4, path: enemyPath, isPlayer: false }
      ];

      roster.slice(0, mode.playerCount).forEach((entry, index) => {
        const entity = createCharacter({
          id: entry.id,
          path: entry.path,
          guns,
          team: entry.team,
          color: entry.color,
          spawn: spawnPoints[index]
        });
        entity.displayName = entry.name;
        entity.isPlayer = entry.isPlayer;
        entity.spawnPoint = spawnPoints[index].clone();
        if (!entry.isPlayer) {
          entity.isAI = true;
          entity.ai = {
            thinkTimer: 0.8, // Delay before AI starts thinking
            strafeDir: 1,
            targetNode: null,
            lastHitTime: -999,
            dashBias: 0,
            burstCount: 0, // Track shots in current burst
            burstCooldown: 0, // Pause between bursts
            desiredMove: null,
            fireIntent: false
          };
        }
        world.entities.push(entity);
      });
    }


    export function clearEntities() {
      world.entities.forEach((entity) => {
        if (entity.muzzle) world.scene.remove(entity.muzzle);
        if (entity.group) world.scene.remove(entity.group);
      });
      world.entities = [];
      world.mixers = [];
    }


    export function getSpawnPoints(count) {
      return SPAWN_POINTS.slice(0, count).map((point) => point.clone());
    }


	    export function createCharacter({ id, path, guns, team, color, spawn }) {
	      const clone = cloneAsset(path);
	      let root;
	      if (clone) {
	        root = normalizeToHeight(clone.root, CONFIG.player.height);
      } else {
        root = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.35, 1.2, 6, 12),
          new THREE.MeshStandardMaterial({ color })
        );
      }
      root.traverse?.((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      const gunMeshes = findBuiltInWeapons(root);

      const group = new THREE.Group();
      group.add(root);
      group.position.copy(spawn);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.45, 0.6, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      group.add(ring);

      const muzzle = createSprite(0xffffff, 0.3);
      muzzle.visible = false;
      world.scene.add(muzzle); // Add to scene (world space) not group (local space)

      world.scene.add(group);

	      const entity = {
	        id,
	        assetPath: path,
	        color,
	        team,
	        group,
	        root,
	        position: group.position,
        velocity: new THREE.Vector3(),
        yaw: 0,
        hp: 100,
        weapon: createWeaponLoadout(),
        fireCooldown: 0,
        firedRecentlyTimer: 0,
        dashTimer: 0,
        dashCooldown: 0,
	        kickCooldown: 0,
	        stunTimer: 0,
	        nearMissCooldown: 0,
	        grenadeAmmo: CONFIG.grenade.ammoStart,
	        grenadeCooldown: 0,
	        stunTilt: 0,
		        isDead: false,
		        guns: gunMeshes,
		        muzzle,
		        mixers: setupAnimations(root, clone ? clone.animations : []),
	        visuals: (() => {
	          const active = clone ? 'gltf' : 'placeholder';
	          const visuals = { gltf: null, placeholder: null };
	          visuals[active] = root;
	          return visuals;
	        })(),
	        activeVisual: clone ? 'gltf' : 'placeholder',
	        visualAnimations: {
	          gltf: clone ? (clone.animations || []) : [],
	          placeholder: []
	        }
	      };

      syncWeaponVisibility(entity);
      return entity;
    }


    export function createWeaponLoadout() {
      const states = {};
      Object.keys(CONFIG.weapons).forEach((weaponId) => {
        const weapon = CONFIG.weapons[weaponId];
        const unlocked = weaponId === 'pistol';
        const reserveStart = Math.min(weapon.reserveStart || 0, weapon.reserveMax || 0);
        states[weaponId] = {
          ammo: unlocked ? weapon.magSize : 0,
          reserve: unlocked ? reserveStart : 0,
          reloadTimer: 0,
          unlocked
        };
      });
      return {
        id: 'pistol',
        pending: null,
        switchTimer: 0,
        states
      };
    }


    export function getWeaponConfig(weaponId) {
      return CONFIG.weapons[weaponId];
    }


    export function getActiveWeaponConfig(entity) {
      return getWeaponConfig(entity.weapon.id);
    }


    export function getWeaponState(entity, weaponId = entity.weapon.id) {
      return entity.weapon.states[weaponId];
    }


    export function canUseWeapon(entity, weaponId) {
      const state = getWeaponState(entity, weaponId);
      return Boolean(state && state.unlocked && (state.ammo > 0 || state.reserve > 0));
    }


    export function syncWeaponVisibility(entity) {
      if (!entity.guns) return;
      Object.entries(entity.guns).forEach(([weaponId, gun]) => {
        if (!gun) return;
        gun.visible = weaponId === entity.weapon.id;
      });
    }


    export function requestWeaponSwitch(entity, weaponId) {
      if (!entity || entity.isDead) return;
      if (!CONFIG.weapons[weaponId]) return;
      if (entity.weapon.switchTimer > 0) return;
      if (entity.weapon.id === weaponId) return;
      const nextState = getWeaponState(entity, weaponId);
      if (!nextState || !nextState.unlocked) return;
      if (nextState.ammo <= 0 && nextState.reserve <= 0) return;
      entity.weapon.pending = weaponId;
      entity.weapon.switchTimer = CONFIG.weaponSwitch.duration;
      entity.fireCooldown = Math.max(entity.fireCooldown, 0.05);
      fx.fovPulse = Math.max(fx.fovPulse, 0.3);
    }


    export function updateWeaponSwitch(entity, dt) {
      if (entity.weapon.switchTimer <= 0) return;
      entity.weapon.switchTimer -= dt;
      if (entity.weapon.switchTimer <= 0 && entity.weapon.pending) {
        entity.weapon.id = entity.weapon.pending;
        entity.weapon.pending = null;
        syncWeaponVisibility(entity);
      }
    }


    export function setupAnimations(root, animations) {
      if (!animations || animations.length === 0) return null;
      const mixer = new THREE.AnimationMixer(root);
      const findClip = (tokens) => animations.find(clip => tokens.some(t => clip.name.toLowerCase().includes(t)));
      const idle = findClip(['idle', 'stand', 'breathe']) || animations[0];
      const run = findClip(['run', 'walk', 'move']) || idle;
      const shoot = findClip(['shoot', 'fire', 'attack']) || null;
      const reload = findClip(['reload', 'reloading']) || null;
      const death = findClip(['death', 'die', 'dead']) || null;
      const hit = findClip(['hit', 'hurt', 'stun', 'fall', 'knock', 'impact', 'flinch']) || death || null;
      const actions = {
        idle: idle ? mixer.clipAction(idle) : null,
        run: run ? mixer.clipAction(run) : null,
        shoot: shoot ? mixer.clipAction(shoot) : null,
        reload: reload ? mixer.clipAction(reload) : null,
        hit: hit ? mixer.clipAction(hit) : null,
        death: death ? mixer.clipAction(death) : null
      };
      if (actions.idle) actions.idle.play();
      const entry = { mixer, actions, current: 'idle' };
      if (actions.shoot) {
        actions.shoot.clampWhenFinished = false;
        actions.shoot.setLoop(THREE.LoopOnce, 1);
        actions.shoot.enabled = true;
        actions.shoot.setEffectiveWeight(1);
        actions.shoot.setEffectiveTimeScale(1.4);
      }
      if (actions.death) {
        actions.death.clampWhenFinished = true;
        actions.death.setLoop(THREE.LoopOnce, 1);
        actions.death.enabled = true;
        actions.death.setEffectiveWeight(1);
      }
      if (actions.reload) {
        actions.reload.clampWhenFinished = false;
        actions.reload.setLoop(THREE.LoopRepeat, Infinity);
        actions.reload.enabled = true;
        actions.reload.setEffectiveWeight(1);
      }
      if (actions.hit) {
        actions.hit.clampWhenFinished = true;
        actions.hit.setLoop(THREE.LoopOnce, 1);
        actions.hit.enabled = true;
        actions.hit.setEffectiveWeight(1);
      }
      world.mixers.push(entry);
      return entry;
    }


    export function updateMixers(dt) {
      if (state.mode === 'paused' || fx.hitstopTimer > 0) return;
      world.mixers.forEach((entry) => {
        entry.mixer.update(dt);
      });
    }


    export function updateAnimationState(entity, stateName) {
      const mixerEntry = entity.mixers;
      if (!mixerEntry) return;
      // Don't interrupt death animation
      if (mixerEntry.current === 'death') return;
      if (entity.isDead) return;
      const weaponState = entity.weapon ? getWeaponState(entity) : null;
      const isReloading = weaponState && weaponState.reloadTimer > 0 && mixerEntry.actions.reload;
      if (isReloading && stateName !== 'reload') return;
      const isStunned = entity.stunTimer > 0 && mixerEntry.actions.hit;
      if (isStunned && stateName !== 'hit') return;
      if (mixerEntry.current === stateName) return;
      const next = mixerEntry.actions[stateName];
      if (!next) return;
      const current = mixerEntry.actions[mixerEntry.current];
      if (current) current.fadeOut(0.15);
      next.reset();
      next.fadeIn(0.15);
      next.play();
      mixerEntry.current = stateName;
    }
