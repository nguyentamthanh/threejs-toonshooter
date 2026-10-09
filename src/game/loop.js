import { updateAI, updateRespawns } from './ai.js';
import { updateCameraFx } from './camera.js';
import { updateStunVisual } from './combat.js';
import { CONFIG } from './config.js';
import { dramaticOverlay, hitFlash, nearMissFlash } from './dom.js';
import { updateMixers } from './entities.js';
import { updateCharacterFlash, updateParticles, updateSprites, updateTracers } from './fx.js';
import { updateHazards } from './hazards.js';
import { updateHUD, updateMuzzleFlash, updatePopups } from './hud.js';
import { updateKillCam, updateTimer } from './match.js';
import { getDifficultyForMode } from './menu.js';
import { updateFallingCrates, updatePickups, updateSkyDrops } from './pickups.js';
import { updatePlayer } from './player.js';
import { updateCoverStates, updateGrenades, updateRollingBarrels } from './simulation.js';
import { fx, input, state, world } from './state.js';
import { updateScheduled } from './timers.js';
import { updateTouchInput } from './touch.js';
import { getSimTimeScale } from './util.js';

    export function animate() {
      requestAnimationFrame(animate);
      const rawDt = world.clock.getDelta();
      updateFxTimers(rawDt);
      updateScheduled(rawDt);
      updateTouchInput();

      if (state.mode === 'killCam') {
        updateKillCam(rawDt);
      } else if (state.mode === 'playing') {
        updateGame(rawDt);
      } else if (state.mode === 'menu') {
        updateIdle(rawDt);
      }

      const simDt = rawDt * getSimTimeScale();
      updateMixers(simDt);
      updateTracers(simDt);
      updateSprites(simDt);
      updateParticles(simDt);
      updateCameraFx(rawDt);
      input.mouse.justPressed = false;
      world.renderer.render(world.scene, world.camera);
    }


    export function updateFxTimers(dt) {
      if (fx.hitFlashTimer > 0) {
        fx.hitFlashTimer -= dt;
        hitFlash.style.opacity = fx.hitFlashTimer > 0 ? '1' : '0';
      }
      if (fx.nearMissTimer > 0) {
        fx.nearMissTimer -= dt;
        nearMissFlash.style.opacity = fx.nearMissTimer > 0 ? '1' : '0';
      }
      if (fx.dramaticTimer > 0) {
        fx.dramaticTimer -= dt;
        dramaticOverlay.style.opacity = fx.dramaticTimer > 0 ? '1' : '0';
      } else {
        fx.dramaticTeam = null;
        dramaticOverlay.style.opacity = '0';
      }
      if (fx.timeScaleTimer > 0) {
        fx.timeScaleTimer -= dt;
        if (fx.timeScaleTimer <= 0) fx.timeScale = 1;
      }
      if (fx.hitstopTimer > 0) {
        fx.hitstopTimer -= dt;
      }
    }


    export function getModeDifficultyPreset(modeId) {
      const key = getDifficultyForMode(modeId);
      const presets = CONFIG.difficulty?.presets || {};
      return presets[key] || presets.normal || {
        aiHp: 100,
        aiDamageMul: 1,
        aiFireRateMul: 1,
        aiSpreadMul: 1,
        aiThinkBase: 0.35,
        aiThinkJitter: 0.3
      };
    }


    export function getAiTuning(entity) {
      if (!entity || !entity.isAI) return null;
      return getModeDifficultyPreset(state.gameMode);
    }


    export function updateGame(dt) {
      const scaledDt = fx.hitstopTimer > 0 ? 0 : dt * fx.timeScale;

      updateTimer(scaledDt);
      updateSkyDrops(scaledDt);
      updateFallingCrates(scaledDt);
	      updatePickups(scaledDt);
	      updateRollingBarrels(scaledDt);
	      updateCoverStates(scaledDt);
	      updateGrenades(scaledDt);
      updateHazards(scaledDt);
      world.entities.forEach((entity) => {
        if (!entity || entity.eliminated) return;
        if (entity.isAI) {
          updateAI(entity, scaledDt);
        } else {
          updatePlayer(entity, scaledDt);
        }
        updateStunVisual(entity, dt);
        updateMuzzleFlash(entity, scaledDt);
        updateCharacterFlash(entity, dt); // Use raw dt for flash timing
      });
      updateRespawns(scaledDt);
      updatePopups(dt);
      updateHUD();
    }


    export function updateIdle(dt) {
      world.entities.forEach((entity) => {
        updateMuzzleFlash(entity, dt);
      });
      updateCoverStates(dt);
      updatePopups(dt);
    }
