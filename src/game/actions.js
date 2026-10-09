import * as THREE from 'three';
import { getAITarget } from './ai.js';
import { flashCover } from './combat.js';
import { CONFIG } from './config.js';
import { dashEl } from './dom.js';
import { getAimDirection, getAimPoint, getMoveInput } from './input.js';
import { createGrenadeMesh } from './pickups.js';
import { fx, world } from './state.js';
import { getPlayer } from './util.js';

    export function tryDash(entity, aiInitiated = false) {
      if (entity.dashCooldown > 0 || entity.dashTimer > 0) {
        if (!aiInitiated) {
          dashEl.classList.remove('shake');
          void dashEl.offsetWidth;
          dashEl.classList.add('shake');
        }
        return;
      }
      const dir = getDashDirection(entity);
      entity.velocity.copy(dir).multiplyScalar(CONFIG.movement.dashSpeed);
      entity.dashTimer = CONFIG.movement.dashDuration;
      entity.dashCooldown = CONFIG.movement.dashCooldown;
      fx.fovPulse = 1;
    }


    export function getDashDirection(entity) {
      const moveDir = entity.isAI ? (entity.ai.desiredMove || new THREE.Vector3()) : getMoveInput();
      if (moveDir.lengthSq() > 0.01) return moveDir.clone().normalize();
      const aim = getAimDirection(entity, entity.isAI ? getPlayer().position : null);
      return aim.lengthSq() > 0 ? aim : new THREE.Vector3(0, 0, 1);
    }


	    export function tryThrowGrenade(entity, aiInitiated = false) {
	      if (!entity || entity.isDead || entity.eliminated) return;
	      if (entity.stunTimer > 0) return;
	      if (entity.weapon?.switchTimer > 0) return;
	      if ((entity.grenadeAmmo ?? 0) <= 0) return;
	      if ((entity.grenadeCooldown ?? 0) > 0) return;

	      const aimPoint = entity.isAI ? getAITarget(entity)?.position : getAimPoint();
	      const dir = getAimDirection(entity, aimPoint);
	      const forward = dir.clone().normalize();
	      const right = new THREE.Vector3(-forward.z, 0, forward.x);

	      const origin = entity.position.clone();
	      origin.y = 1.22;
	      origin.addScaledVector(forward, 0.55);
	      origin.addScaledVector(right, 0.18);

	      const velocity = forward.multiplyScalar(CONFIG.grenade.throwSpeed);
	      if (aimPoint) {
	        const dx = aimPoint.x - entity.position.x;
	        const dz = aimPoint.z - entity.position.z;
	        const dist = Math.hypot(dx, dz);
	        velocity.y = CONFIG.grenade.throwUp + THREE.MathUtils.clamp(dist * 0.16, 0, 2.8);
	      } else {
	        velocity.y = CONFIG.grenade.throwUp;
	      }
	      velocity.x += entity.velocity.x * 0.35;
	      velocity.z += entity.velocity.z * 0.35;

      spawnGrenade(origin, velocity, entity.team);
      entity.grenadeAmmo = Math.max(0, (entity.grenadeAmmo ?? 0) - 1);
      entity.grenadeCooldown = CONFIG.grenade.cooldown;
      if (!aiInitiated) fx.fovPulse = Math.max(fx.fovPulse, 0.45);
    }


    export function spawnGrenade(position, velocity, sourceTeam) {
      const { mesh, activeVisual } = createGrenadeMesh();
      mesh.position.copy(position);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      world.scene.add(mesh);

      const grenade = {
        mesh,
        position: mesh.position,
        velocity: velocity.clone(),
        radius: CONFIG.grenade.radius,
        fuse: CONFIG.grenade.fuse,
        sourceTeam,
        visuals: (() => {
          const visuals = { gltf: null, placeholder: null };
          visuals[activeVisual] = mesh;
          return visuals;
        })(),
        activeVisual
      };
      world.grenades.push(grenade);
      return grenade;
    }


    export function tryKick(entity, aiInitiated = false) {
      if (!entity || entity.isDead) return;
      if (entity.stunTimer > 0) return;
      if (entity.kickCooldown > 0) return;
      if (entity.weapon.switchTimer > 0) return;

      const kickable = getNearbyKickable(entity);
      if (!kickable) return;

      const dir = getAimDirection(entity, entity.isAI ? getPlayer().position : null);
      if (kickable.type === 'barrel') {
        kickBarrel(kickable.object, dir, entity.team);
      } else if (kickable.type === 'cover') {
        kickCover(kickable.object, dir, entity.team);
      }

      entity.kickCooldown = CONFIG.kick.cooldown;
      if (!aiInitiated) fx.fovPulse = Math.max(fx.fovPulse, 0.65);
    }


    export function getNearbyKickable(entity) {
      const kickRange = CONFIG.kick.range;
      for (const barrel of world.barrels) {
        if (!barrel.alive) continue;
        if (barrel.isRolling) continue;
        if (barrel.position.distanceTo(entity.position) < kickRange) {
          return { type: 'barrel', object: barrel };
        }
      }
      for (const cover of world.cover) {
        if (cover.active === false) continue;
        if (!cover.kickable) continue;
        if (!cover.destructible) continue;
        if (!cover.mesh || cover.mesh.visible === false) continue;
        if (distToAABB(entity.position, cover) < kickRange) {
          return { type: 'cover', object: cover };
        }
      }
      return null;
    }


    export function distToAABB(pos, box) {
      const clampedX = THREE.MathUtils.clamp(pos.x, box.minX, box.maxX);
      const clampedZ = THREE.MathUtils.clamp(pos.z, box.minZ, box.maxZ);
      return Math.hypot(pos.x - clampedX, pos.z - clampedZ);
    }


    export function kickBarrel(barrel, direction, sourceTeam) {
      if (!barrel.alive) return;
      barrel.isRolling = true;
      barrel.velocity.copy(direction).multiplyScalar(CONFIG.kick.barrelRollSpeed);
      barrel.rollTimer = CONFIG.kick.barrelRollTime;
      barrel.lastDamagedByTeam = sourceTeam;
    }


    export function kickCover(cover, direction, sourceTeam) {
      if (!cover || cover.active === false) return;
      if (!cover.destructible) return;
      if (cover.kickState) return;
      cover.kickState = {
        velocity: direction.clone().multiplyScalar(CONFIG.kick.coverSlideSpeed),
        timer: CONFIG.kick.coverSlideDuration,
        sourceTeam
      };
      flashCover(cover, 0.06);
    }
