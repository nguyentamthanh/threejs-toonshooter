import * as THREE from 'three';
import { tryDash, tryKick } from './actions.js';
import { hasLineOfSight } from './collision.js';
import { attemptFire, startReload, updateReload } from './combat.js';
import { CONFIG } from './config.js';
import { canUseWeapon, getActiveWeaponConfig, getSpawnPoints, getWeaponState, requestWeaponSwitch, updateWeaponSwitch } from './entities.js';
import { getAimDirection, updateAim } from './input.js';
import { getAiTuning } from './loop.js';
import { resetEntity } from './match.js';
import { getActiveGameMode } from './menu.js';
import { applyMovement, resolveCollisions } from './player.js';
import { state, world } from './state.js';

    export function updateAI(enemy, dt) {
      if (!enemy || !enemy.ai || enemy.isDead || enemy.eliminated) return;
      const player = getAITarget(enemy);
      if (!player) return;

      updateWeaponSwitch(enemy, dt);
      updateReload(enemy, dt);

      if (enemy.stunTimer > 0) {
        enemy.stunTimer -= dt;
        const nextPos = enemy.position.clone().addScaledVector(enemy.velocity, dt);
        resolveCollisions(nextPos, CONFIG.player.radius);
        enemy.position.copy(nextPos);
        enemy.velocity.multiplyScalar(Math.max(0, 1 - dt * 2.2));
      }

      enemy.ai.thinkTimer -= dt;
      if (enemy.ai.thinkTimer <= 0) {
        const tuning = getAiTuning(enemy) || { aiThinkBase: 0.35, aiThinkJitter: 0.3 };
        enemy.ai.thinkTimer = tuning.aiThinkBase + (Math.random() - 0.5) * tuning.aiThinkJitter;
        decideAI(enemy, player);
      }

      // Burst cooldown management
      if (enemy.ai.burstCooldown > 0) {
        enemy.ai.burstCooldown -= dt;
      }

      if (enemy.stunTimer <= 0) {
        const desired = enemy.ai.desiredMove || new THREE.Vector3();
        applyMovement(enemy, desired, dt);
        updateAim(enemy, player.position, dt);

        const weapon = getActiveWeaponConfig(enemy);
        const weaponState = getWeaponState(enemy);

        if (weaponState.ammo <= 0 && weaponState.reloadTimer <= 0) {
          startReload(enemy);
        }

        const canFire = enemy.weapon.switchTimer <= 0 && weaponState.reloadTimer <= 0;
        if (enemy.ai.fireIntent && canFire && enemy.fireCooldown <= 0) {
          if (enemy.weapon.id === 'smg') {
            // Burst fire: AI fires 3-5 shots then pauses
            if (enemy.ai.burstCooldown <= 0) {
              attemptFire(enemy, getAimDirection(enemy, player.position), true);
              enemy.ai.burstCount += 1;
              if (enemy.ai.burstCount >= 3 + Math.floor(Math.random() * 3)) {
                enemy.ai.burstCooldown = 0.4 + Math.random() * 0.3;
                enemy.ai.burstCount = 0;
              }
            }
          } else {
            // Single, deliberate shots
            attemptFire(enemy, getAimDirection(enemy, player.position), true);
          }
        }
      }

	      if (enemy.fireCooldown > 0) enemy.fireCooldown -= dt;
	      if (enemy.dashCooldown > 0) enemy.dashCooldown -= dt;
	      if (enemy.kickCooldown > 0) enemy.kickCooldown -= dt;
	      if (enemy.nearMissCooldown > 0) enemy.nearMissCooldown -= dt;
	      if (enemy.grenadeCooldown > 0) enemy.grenadeCooldown -= dt;
	      if (enemy.firedRecentlyTimer > 0) enemy.firedRecentlyTimer -= dt;
	    }


    export function getAITarget(aiEntity) {
      let best = null;
      let bestDist = Infinity;
      world.entities.forEach((entity) => {
        if (!entity || entity === aiEntity || entity.isDead || entity.eliminated) return;
        const dist = entity.position.distanceTo(aiEntity.position);
        if (dist < bestDist) {
          bestDist = dist;
          best = entity;
        }
      });
      return best;
    }


    export function updateRespawns(dt) {
      if (state.gameMode !== 'deathmatch' || state.matchEnded) return;
      world.entities.forEach((entity) => {
        if (!entity || entity.eliminated || !entity.isDead) return;
        if (!entity.respawnTimer || entity.respawnTimer <= 0) return;
        entity.respawnTimer -= dt;
        if (entity.respawnTimer <= 0) {
          const spawn = chooseRespawnPoint(entity);
          resetEntity(entity, spawn);
        }
      });
    }


    export function chooseRespawnPoint(entity) {
      const points = getSpawnPoints(getActiveGameMode().playerCount);
      let best = points[0] || new THREE.Vector3();
      let bestScore = -Infinity;
      points.forEach((point) => {
        let minDist = Infinity;
        world.entities.forEach((other) => {
          if (!other || other === entity || other.eliminated || other.isDead) return;
          const dist = point.distanceTo(other.position);
          if (dist < minDist) minDist = dist;
        });
        const score = minDist === Infinity ? 0 : minDist;
        if (score > bestScore) {
          bestScore = score;
          best = point;
        }
      });
      return best.clone();
    }


    export function decideAI(enemy, player) {
      const toPlayer = player.position.clone().sub(enemy.position);
      const dist = Math.hypot(toPlayer.x, toPlayer.z);
      const hasLoS = hasLineOfSight(enemy.position, player.position);

      const preference = dist < 9
        ? ['shotgun', 'smg', 'pistol']
        : dist > 22
          ? ['pistol', 'smg', 'shotgun']
          : ['smg', 'pistol', 'shotgun'];
      const desiredWeapon = preference.find((id) => canUseWeapon(enemy, id)) || enemy.weapon.id;
      if (desiredWeapon !== enemy.weapon.id && enemy.weapon.switchTimer <= 0) {
        requestWeaponSwitch(enemy, desiredWeapon);
      }

      // Rare dramatic kick when close and something is kickable nearby
      if (enemy.kickCooldown <= 0 && dist < 2.2 && Math.random() < 0.06) {
        tryKick(enemy, true);
      }

      const activeWeapon = getActiveWeaponConfig(enemy);
      enemy.ai.fireIntent = hasLoS && dist < activeWeapon.range;

      if (enemy.hp <= 35) {
        enemy.ai.desiredMove = moveToCover(enemy, player, true);
        if (hasLoS && enemy.dashCooldown <= 0) tryDash(enemy, true);
        return;
      }

      if (hasLoS && dist >= 8 && dist <= 14) {
        const strafe = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
        enemy.ai.strafeDir *= Math.random() < 0.12 ? -1 : 1;
        enemy.ai.desiredMove = strafe.multiplyScalar(enemy.ai.strafeDir);
      } else {
        enemy.ai.desiredMove = moveToCover(enemy, player, false);
      }

      if (!hasLoS && dist < 6 && enemy.dashCooldown <= 0) {
        tryDash(enemy, true);
      }
    }


    export function moveToCover(enemy, player, retreat) {
      let bestNode = null;
      let bestScore = Infinity;
      world.nodes.forEach((node) => {
        const distance = node.distanceTo(player.position);
        const hasLoS = hasLineOfSight(node, player.position);
        let score = Math.abs(distance - 10);
        if (retreat && hasLoS) score += 6;
        if (!retreat && !hasLoS) score += 4;
        if (distance < 5) score += 5;
        if (score < bestScore) {
          bestScore = score;
          bestNode = node;
        }
      });

      enemy.ai.targetNode = bestNode || enemy.position;
      const dir = bestNode ? bestNode.clone().sub(enemy.position) : new THREE.Vector3();
      dir.y = 0;
      if (dir.lengthSq() > 0.1) dir.normalize();
      return dir;
    }
