import * as THREE from 'three';
import { buildCoverNodes, syncCoverColliderFromMesh } from './arena.js';
import { CONFIG } from './config.js';
import { bannerEl, killCamTextEl, matchStats, matchTitle, suddenDeathEl } from './dom.js';
import { createWeaponLoadout, getSpawnPoints, syncWeaponVisibility } from './entities.js';
import { setTimeScale, spawnHitEffect } from './fx.js';
import { showBanner, updateBestTimeUI, updatePopups, updateRoundPips } from './hud.js';
import { getModeDifficultyPreset } from './loop.js';
import { applyGameMode, getActiveGameMode, setMode } from './menu.js';
import { clearGrenades, clearPickups } from './pickups.js';
import { fx, state, world } from './state.js';
import { formatTime, getEnemy, getEntityByTeam, getPlayer } from './util.js';

    export function startMatch() {
      if (state.activeGameMode !== state.gameMode) {
        applyGameMode(state.gameMode);
      }
      const mode = getActiveGameMode();
      state.wins.p1 = 0;
      state.wins.p2 = 0;
      state.round = 1;
      state.roundResults = [];
      state.timeLeft = CONFIG.match.totalTime;
      state.lives = {};
      state.suddenDeath = false;
      state.matchEnded = false;
      state.roundEnding = false;
      state.lastKill = null;
      state.killCam = null;
      killCamTextEl.classList.remove('show');
      suddenDeathEl.classList.remove('show');
      state.matchStartTime = performance.now();
      world.entities.forEach((entity) => {
        entity.lives = mode.lives || 1;
        entity.eliminated = false;
        entity.respawnTimer = 0;
      });
	      resetEntities();
	      resetBarrels();
	      resetCover();
	      clearPickups();
	      clearGrenades();
	      world.skyDropTimer = CONFIG.pickups.skyDropInterval;
	      updateRoundPips();
	      setMode('roundIntro');
      showBanner(state.gameMode === 'deathmatch' ? 'FREE FOR ALL · FIGHT!' : `ROUND ${state.round} · FIGHT!`);
      setTimeout(() => {
        if (state.mode === 'roundIntro') {
          setMode('playing');
        }
      }, 1000);
    }


    export function resetEntities() {
      const mode = getActiveGameMode();
      const spawns = getSpawnPoints(mode.playerCount);
      world.entities.forEach((entity, index) => {
        const spawn = entity.spawnPoint || spawns[index] || new THREE.Vector3(0, 0, 0);
        resetEntity(entity, spawn);
      });
    }


    export function resetEntity(entity, spawn) {
      if (!entity) return;
      entity.position.copy(spawn);
      entity.velocity.set(0, 0, 0);
      entity.group.rotation.x = 0;
      entity.stunTilt = 0;
      if (entity.isAI) {
        entity.hp = getModeDifficultyPreset(state.gameMode).aiHp;
      } else {
        entity.hp = 100;
      }
      entity.weapon = createWeaponLoadout();
      syncWeaponVisibility(entity);
      entity.fireCooldown = 0;
      entity.firedRecentlyTimer = 0;
      entity.dashTimer = 0;
      entity.dashCooldown = 0;
	      entity.kickCooldown = 0;
	      entity.stunTimer = 0;
	      entity.nearMissCooldown = 0;
	      entity.grenadeAmmo = CONFIG.grenade.ammoStart;
	      entity.grenadeCooldown = 0;
	      entity.isDead = false;
	      entity.eliminated = false;
	      entity.respawnTimer = 0;
      // Reset animation to idle
      resetAnimationToIdle(entity);
      if (entity.ai) {
        entity.ai.thinkTimer = 0.8; // Delay before AI starts thinking (gives idle animation time)
        entity.ai.strafeDir = 1;
        entity.ai.targetNode = null;
        entity.ai.lastHitTime = -999;
        entity.ai.burstCount = 0;
        entity.ai.burstCooldown = 0;
        entity.ai.desiredMove = null; // Clear any previous move intent
        entity.ai.fireIntent = false; // Don't fire immediately
      }
    }


    export function resetAnimationToIdle(entity) {
      const mixerEntry = entity.mixers;
      if (!mixerEntry) return;
      // Stop all animations
      Object.values(mixerEntry.actions).forEach(action => {
        if (action) {
          action.stop();
        }
      });
      // Start idle
      if (mixerEntry.actions.idle) {
        mixerEntry.actions.idle.reset();
        mixerEntry.actions.idle.play();
      }
      mixerEntry.current = 'idle';
    }


    export function resetBarrels() {
      // First, remove all spilled barrel meshes from the scene
      world.spilledBarrels.forEach((mesh) => {
        world.scene.remove(mesh);
        // Dispose of geometry and materials to free memory
        mesh.traverse?.((child) => {
          if (child.isMesh) {
            child.geometry?.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      });
      world.spilledBarrels = [];

      // Clean up any remaining particles
      world.fxParticles.forEach((particle) => {
        world.scene.remove(particle);
        particle.geometry?.dispose();
        particle.material?.dispose();
      });
      world.fxParticles = [];

      // Reset all barrels to their initial state
      world.barrels.forEach((barrel) => {
        barrel.hp = CONFIG.barrel.hp;
        barrel.alive = true;
        barrel.mesh.visible = true;
        if (barrel.spawnPos) barrel.position.copy(barrel.spawnPos);
        barrel.velocity?.set(0, 0, 0);
        barrel.isRolling = false;
        barrel.rollTimer = 0;
        barrel.lastDamagedByTeam = null;
        barrel.spilledMesh = null; // Clear the spilled mesh reference
      });
    }


    export function resetCover() {
      world.cover.forEach((cover) => {
        if (!cover.destructible) return;
        cover.hp = cover.maxHp;
        cover.active = true;
        cover.kickState = null;
        cover.flashTimer = 0;
        if (cover.originalMaterials) {
          cover.originalMaterials.forEach(({ mesh, material }) => {
            mesh.material = material;
          });
        }
        if (cover.mesh) {
          cover.mesh.visible = true;
          if (cover.spawnPos) cover.mesh.position.copy(cover.spawnPos);
          if (typeof cover.spawnRotY === 'number') cover.mesh.rotation.y = cover.spawnRotY;
        }
        syncCoverColliderFromMesh(cover);
      });
      buildCoverNodes();
    }


    export function updateTimer(dt) {
      if (state.suddenDeath || state.matchEnded) return;
      state.timeLeft = Math.max(0, state.timeLeft - dt);
      if (state.timeLeft <= 0 && !state.suddenDeath && !state.matchEnded) {
        if (state.gameMode === 'deathmatch') {
          const contenders = world.entities.filter((entity) => entity && !entity.eliminated);
          if (contenders.length <= 1) {
            endMatch(contenders[0]?.team);
            return;
          }
          const maxLives = Math.max(...contenders.map(entity => entity.lives ?? 0));
          const leaders = contenders.filter(entity => (entity.lives ?? 0) === maxLives);
          if (leaders.length === 1) {
            endMatch(leaders[0].team);
          } else {
            state.suddenDeath = true;
            suddenDeathEl.classList.add('show');
          }
        } else {
          const player = getPlayer();
          const enemy = getEnemy();
          if (player && enemy && player.hp === enemy.hp) {
            state.suddenDeath = true;
            suddenDeathEl.classList.add('show');
          } else if (player && enemy) {
            endRound(player.hp > enemy.hp ? 'p1' : 'p2', true);
          }
        }
      }
    }


    export function endRound(winner, timeExpired) {
      if (state.gameMode === 'deathmatch') return;
      if (state.roundEnding || state.matchEnded) return;
      state.roundEnding = true;
      state.suddenDeath = false;
      suddenDeathEl.classList.remove('show');

      if (winner === 'p1') state.wins.p1 += 1;
      if (winner === 'p2') state.wins.p2 += 1;
      state.roundResults.push(winner);
      updateRoundPips();

      const matchWillEnd = !timeExpired && (state.wins[winner] >= CONFIG.match.roundsToWin);
      if (matchWillEnd && state.lastKill) {
        triggerKillCam(winner);
        return;
      }

      setTimeScale(0.8, 0.35);
      showBanner(winner === 'p1' ? 'PLAYER 1 WINS ROUND' : 'PLAYER 2 WINS ROUND');

      setTimeout(() => {
        state.roundEnding = false;
        if (state.wins.p1 >= CONFIG.match.roundsToWin || state.wins.p2 >= CONFIG.match.roundsToWin || timeExpired) {
          endMatch(winner);
        } else {
          state.round += 1;
	          resetEntities();
	          resetBarrels();
	          resetCover();
	          clearPickups();
	          clearGrenades();
	          setMode('roundIntro');
	          showBanner(`ROUND ${state.round} · FIGHT!`);
          setTimeout(() => {
            if (state.mode === 'roundIntro') setMode('playing');
          }, 1000);
        }
      }, 1200);
    }


    export function triggerKillCam(winnerTeam) {
      const last = state.lastKill;
      if (!last) {
        endMatch(winnerTeam);
        return;
      }

      // Clear transient FX so the cinematic reads cleanly.
      fx.timeScale = 1;
      fx.timeScaleTimer = 0;
      fx.hitstopTimer = 0;
      fx.nearMissTimer = 0;
      fx.dramaticTimer = 0;
      fx.dramaticTeam = null;
      killCamTextEl.classList.remove('show');

      const shooter = last.shooterPos.clone();
      const victim = last.victimPos.clone();
      const center = shooter.clone().add(victim).multiplyScalar(0.5);
      center.y = 0.8;
      const distance = Math.max(3, shooter.distanceTo(victim));
      const radius = distance / 2 + 3;

      const startAngle = Math.atan2(shooter.x - center.x, shooter.z - center.z);

      state.killCam = {
        active: true,
        winnerTeam,
        shooter,
        victim,
        center,
        radius,
        startAngle,
        orbitAngle: startAngle,
        startCamPos: world.camera.position.clone(),
        startCamLookAt: world.cameraState?.lookAt?.clone?.() || center.clone(),
        startCamFov: world.camera.fov,
        phase: 'freeze',
        timer: 0,
        didImpactFx: false,
        timeScale: 0
      };

      setMode('killCam');
    }


    export function updateKillCam(dt) {
      const kc = state.killCam;
      if (!kc || !kc.active) return;

      const freezeDur = 0.3;
      const orbitDur = 1.5;
      const impactDur = 0.5;
      const slamDur = 0.3;
      const holdDur = 0.5;

      kc.timer += dt;

      if (kc.phase === 'freeze') {
        kc.timeScale = 0;
        world.camera.position.copy(kc.startCamPos);
        world.camera.fov = kc.startCamFov;
        world.camera.updateProjectionMatrix();
        world.camera.lookAt(kc.startCamLookAt);
        if (kc.timer >= freezeDur) {
          kc.phase = 'orbit';
          kc.timer = 0;
          kc.timeScale = 0.2;
        }
      } else if (kc.phase === 'orbit') {
        kc.timeScale = 0.2;
        const t = THREE.MathUtils.clamp(kc.timer / orbitDur, 0, 1);
        kc.orbitAngle = kc.startAngle + Math.PI * t;
        if (kc.timer >= orbitDur) {
          kc.phase = 'impact';
          kc.timer = 0;
        }
      } else if (kc.phase === 'impact') {
        kc.timeScale = 0.2;
        if (!kc.didImpactFx) {
          kc.didImpactFx = true;
          spawnHitEffect(kc.victim, kc.winnerTeam === 'p1' ? 'p2' : 'p1', true);
          fx.shakeTime = 0.22;
          fx.shakeIntensity = 0.5;
        }
        if (kc.timer >= impactDur) {
          kc.phase = 'slam';
          kc.timer = 0;
          killCamTextEl.classList.add('show');
        }
      } else if (kc.phase === 'slam') {
        kc.timeScale = 0.05;
        if (kc.timer >= slamDur) {
          kc.phase = 'hold';
          kc.timer = 0;
        }
      } else if (kc.phase === 'hold') {
        kc.timeScale = 0.02;
        if (kc.timer >= holdDur) {
          killCamTextEl.classList.remove('show');
          state.killCam = null;
          endMatch(kc.winnerTeam);
          return;
        }
      }

      if (kc.phase !== 'freeze') {
        // Camera orbit math (handled separately from the normal dynamic camera).
        const phaseT = kc.phase === 'orbit' ? THREE.MathUtils.clamp(kc.timer / orbitDur, 0, 1) : 1;
        const height = 4.8 + Math.sin(phaseT * Math.PI) * 2.2 - phaseT * 1.2;
        const camPos = new THREE.Vector3(
          kc.center.x + Math.sin(kc.orbitAngle) * kc.radius,
          kc.center.y + height,
          kc.center.z + Math.cos(kc.orbitAngle) * kc.radius
        );
        world.camera.position.copy(camPos);
        world.camera.fov = 45;
        world.camera.updateProjectionMatrix();
        world.camera.lookAt(kc.center);
      }

      updatePopups(dt);
    }


    export function endMatch(winner) {
      state.matchEnded = true;
      state.suddenDeath = false;
      suddenDeathEl.classList.remove('show');
      setMode('matchOver');
      const elapsed = CONFIG.match.totalTime - state.timeLeft;
      if (!winner) {
        matchTitle.textContent = 'MATCH OVER';
      } else {
        const winnerEntity = getEntityByTeam(winner);
        const winnerLabel = winnerEntity?.displayName || (winner === 'p1' ? 'Player 1' : winner === 'p2' ? 'Player 2' : 'Player');
        matchTitle.textContent = `${winnerLabel.toUpperCase()} WINS!`;
      }
      matchStats.textContent = `Match time: ${formatTime(elapsed)}`;

      if (state.gameMode === 'duel' && winner === 'p1') {
        if (state.bestWinTime === null || elapsed < state.bestWinTime) {
          state.bestWinTime = elapsed;
          localStorage.setItem('tinyToonDuel_bestWinSeconds', String(elapsed));
        }
      }
      updateBestTimeUI();
    }


    export function togglePause() {
      if (state.mode !== 'playing' && state.mode !== 'paused') return;
      if (state.mode === 'playing') {
        setMode('paused');
        bannerEl.textContent = 'PAUSED';
        bannerEl.classList.add('show');
      } else if (state.mode === 'paused') {
        bannerEl.classList.remove('show');
        setMode('playing');
      }
    }
