import * as THREE from 'three';
import { resolveCircleAABB, resolveCircleCircle } from './collision.js';
import { attemptFire, updateReload } from './combat.js';
import { CONFIG } from './config.js';
import { getActiveWeaponConfig, getWeaponState, updateAnimationState, updateWeaponSwitch } from './entities.js';
import { getAimDirection, getMoveInput, updateAim } from './input.js';
import { input, world } from './state.js';
import { moveToward } from './util.js';

    export function updatePlayer(player, dt) {
      if (!player || player.isDead || player.eliminated) return;
      updateWeaponSwitch(player, dt);
      updateReload(player, dt);

      if (player.stunTimer > 0) {
        player.stunTimer -= dt;
        const nextPos = player.position.clone().addScaledVector(player.velocity, dt);
        resolveCollisions(nextPos, CONFIG.player.radius);
        player.position.copy(nextPos);
        player.velocity.multiplyScalar(Math.max(0, 1 - dt * 2.2));
      } else {
        const moveDir = getMoveInput();
        applyMovement(player, moveDir, dt);
        updateAim(player, null, dt);

        const weapon = getActiveWeaponConfig(player);
        const shouldFire = weapon.auto ? input.mouse.down : input.mouse.justPressed;
        if (shouldFire) {
          attemptFire(player, getAimDirection(player), false);
        }

        // Player reloads manually; avoid auto-reload when switching.
      }

	      if (player.fireCooldown > 0) player.fireCooldown -= dt;
	      if (player.dashCooldown > 0) player.dashCooldown -= dt;
	      if (player.kickCooldown > 0) player.kickCooldown -= dt;
	      if (player.nearMissCooldown > 0) player.nearMissCooldown -= dt;
	      if (player.grenadeCooldown > 0) player.grenadeCooldown -= dt;
	      if (player.firedRecentlyTimer > 0) player.firedRecentlyTimer -= dt;
	    }


    export function applyMovement(entity, moveDir, dt) {
      const accel = CONFIG.movement.accel;
      const maxSpeed = CONFIG.movement.maxSpeed;

      if (entity.dashTimer > 0) {
        entity.dashTimer -= dt;
        if (entity.dashTimer <= 0) {
          entity.velocity.multiplyScalar(0.2);
        }
      } else {
        if (moveDir.lengthSq() > 0) {
          const desired = moveDir.clone().normalize().multiplyScalar(maxSpeed);
          entity.velocity.x = moveToward(entity.velocity.x, desired.x, accel * dt);
          entity.velocity.z = moveToward(entity.velocity.z, desired.z, accel * dt);
        } else {
          entity.velocity.x = moveToward(entity.velocity.x, 0, accel * dt * 1.2);
          entity.velocity.z = moveToward(entity.velocity.z, 0, accel * dt * 1.2);
        }
      }

      const nextPos = entity.position.clone().addScaledVector(entity.velocity, dt);
      resolveCollisions(nextPos, CONFIG.player.radius);
      entity.position.copy(nextPos);

      const speed = Math.hypot(entity.velocity.x, entity.velocity.z);
      // Higher threshold to ensure idle plays when nearly stationary
      const weaponState = entity.weapon ? getWeaponState(entity) : null;
      const wantsReloadAnim = weaponState && weaponState.reloadTimer > 0 && entity.mixers?.actions?.reload;
      updateAnimationState(entity, wantsReloadAnim ? 'reload' : speed > 0.5 ? 'run' : 'idle');
    }


    export function resolveCollisions(pos, radius) {
      world.cover.forEach((box) => {
        if (box.active === false) return;
        if (box.kickState) return;
        resolveCircleAABB(pos, radius, box);
      });
      world.barrels.forEach((barrel) => {
        if (barrel.alive && !barrel.isRolling) resolveCircleCircle(pos, radius, barrel.position, barrel.radius);
      });
      pos.x = THREE.MathUtils.clamp(pos.x, CONFIG.arena.bounds.minX + radius, CONFIG.arena.bounds.maxX - radius);
      pos.z = THREE.MathUtils.clamp(pos.z, CONFIG.arena.bounds.minZ + radius, CONFIG.arena.bounds.maxZ - radius);
    }
