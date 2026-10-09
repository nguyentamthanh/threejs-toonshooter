import * as THREE from 'three';
import { syncCoverColliderFromMesh } from './arena.js';
import { applyDamage, applyStun, destroyCover, explodeBarrel, explodeGrenade, updateCoverFlash } from './combat.js';
import { CONFIG } from './config.js';
import { world } from './state.js';
import { getEntityByTeam } from './util.js';

	    export function updateRollingBarrels(dt) {
	      if (dt <= 0) return;
	      const bounds = CONFIG.arena.bounds;

      world.barrels.forEach((barrel) => {
        if (!barrel.alive) return;
        if (!barrel.isRolling) return;

        barrel.position.addScaledVector(barrel.velocity, dt);
        barrel.rollTimer -= dt;

        const speed = Math.hypot(barrel.velocity.x, barrel.velocity.z);
        barrel.mesh.rotation.x += speed * dt * 2.5;

        const out =
          barrel.position.x < bounds.minX + barrel.radius ||
          barrel.position.x > bounds.maxX - barrel.radius ||
          barrel.position.z < bounds.minZ + barrel.radius ||
          barrel.position.z > bounds.maxZ - barrel.radius;
        if (out || barrel.rollTimer <= 0) {
          explodeBarrel(barrel);
          return;
        }

        for (const cover of world.cover) {
          if (cover.active === false) continue;
          if (circleIntersectsAABB(barrel.position, barrel.radius, cover)) {
            explodeBarrel(barrel);
            return;
          }
        }

        for (const entity of world.entities) {
          if (!entity || entity.isDead || entity.eliminated) continue;
          if (barrel.position.distanceTo(entity.position) <= barrel.radius + CONFIG.player.radius) {
            explodeBarrel(barrel);
            return;
          }
        }
	      });
	    }


		    export function updateGrenades(dt) {
		      if (dt <= 0) return;
		      if (!world.grenades.length) return;
		      const bounds = CONFIG.arena.bounds;
		      const minY = 0.12;
		      const entityHitY = 1.25;
		      const barrelTopY = 1.2;
		      const gravity = CONFIG.grenade.gravity;
		      const drag = Math.max(0, 1 - CONFIG.grenade.drag * dt);
		      const wallBounce = CONFIG.grenade.wallBounce;
		      const groundBounce = CONFIG.grenade.groundBounce;

	      world.grenades = world.grenades.filter((grenade) => {
	        if (!grenade) return false;
	        grenade.fuse -= dt;
	        if (grenade.fuse <= 0) {
	          explodeGrenade(grenade);
	          return false;
	        }

	        grenade.velocity.y += gravity * dt;
	        grenade.velocity.x *= drag;
	        grenade.velocity.z *= drag;
	        grenade.position.addScaledVector(grenade.velocity, dt);

	        if (grenade.position.x < bounds.minX + grenade.radius) {
	          grenade.position.x = bounds.minX + grenade.radius;
	          grenade.velocity.x = Math.abs(grenade.velocity.x) * wallBounce;
	        } else if (grenade.position.x > bounds.maxX - grenade.radius) {
	          grenade.position.x = bounds.maxX - grenade.radius;
	          grenade.velocity.x = -Math.abs(grenade.velocity.x) * wallBounce;
	        }

	        if (grenade.position.z < bounds.minZ + grenade.radius) {
	          grenade.position.z = bounds.minZ + grenade.radius;
	          grenade.velocity.z = Math.abs(grenade.velocity.z) * wallBounce;
	        } else if (grenade.position.z > bounds.maxZ - grenade.radius) {
	          grenade.position.z = bounds.maxZ - grenade.radius;
	          grenade.velocity.z = -Math.abs(grenade.velocity.z) * wallBounce;
	        }

		        if (grenade.position.y < minY) {
		          grenade.position.y = minY;
		          if (grenade.velocity.y < -0.8) {
		            grenade.velocity.y = -grenade.velocity.y * groundBounce;
		            grenade.velocity.x *= 0.78;
		            grenade.velocity.z *= 0.78;
		          } else {
		            grenade.velocity.y = 0;
		          }
		        }

		        for (const barrel of world.barrels) {
		          if (!barrel.alive) continue;
		          if (grenade.position.y > barrelTopY + grenade.radius) continue;
		          const dist = barrel.position.distanceTo(grenade.position);
		          if (dist <= barrel.radius + grenade.radius) {
		            const nx = (grenade.position.x - barrel.position.x) / Math.max(dist, 1e-6);
		            const nz = (grenade.position.z - barrel.position.z) / Math.max(dist, 1e-6);
		            grenade.position.x = barrel.position.x + nx * (barrel.radius + grenade.radius + 0.01);
		            grenade.position.z = barrel.position.z + nz * (barrel.radius + grenade.radius + 0.01);
		            const dot = grenade.velocity.x * nx + grenade.velocity.z * nz;
		            grenade.velocity.x = (grenade.velocity.x - 2 * dot * nx) * 0.65;
		            grenade.velocity.z = (grenade.velocity.z - 2 * dot * nz) * 0.65;
		          }
		        }

		        for (const cover of world.cover) {
		          if (cover.active === false) continue;
		          const coverTopY = typeof cover.maxY === 'number' ? cover.maxY : 1.2;
		          if (grenade.position.y > coverTopY + grenade.radius + 0.08) continue;
		          if (!circleIntersectsAABB(grenade.position, grenade.radius, cover)) continue;
		          // Cheap bounce off the nearest face in XZ.
		          let clampedX = THREE.MathUtils.clamp(grenade.position.x, cover.minX, cover.maxX);
		          let clampedZ = THREE.MathUtils.clamp(grenade.position.z, cover.minZ, cover.maxZ);
	          let nx = grenade.position.x - clampedX;
	          let nz = grenade.position.z - clampedZ;
	          const lenSq = nx * nx + nz * nz;
	          if (lenSq < 1e-6) {
	            const dl = Math.abs(grenade.position.x - cover.minX);
	            const dr = Math.abs(cover.maxX - grenade.position.x);
	            const db = Math.abs(grenade.position.z - cover.minZ);
	            const df = Math.abs(cover.maxZ - grenade.position.z);
	            const min = Math.min(dl, dr, db, df);
	            if (min === dl) { nx = -1; nz = 0; clampedX = cover.minX; clampedZ = grenade.position.z; }
	            else if (min === dr) { nx = 1; nz = 0; clampedX = cover.maxX; clampedZ = grenade.position.z; }
	            else if (min === db) { nx = 0; nz = -1; clampedZ = cover.minZ; clampedX = grenade.position.x; }
	            else { nx = 0; nz = 1; clampedZ = cover.maxZ; clampedX = grenade.position.x; }
	          } else {
	            const invLen = 1 / Math.sqrt(lenSq);
	            nx *= invLen;
	            nz *= invLen;
	          }

	          grenade.position.x = clampedX + nx * (grenade.radius + 0.01);
	          grenade.position.z = clampedZ + nz * (grenade.radius + 0.01);
	          const dot = grenade.velocity.x * nx + grenade.velocity.z * nz;
	          grenade.velocity.x = (grenade.velocity.x - 2 * dot * nx) * 0.62;
		          grenade.velocity.z = (grenade.velocity.z - 2 * dot * nz) * 0.62;
		          break;
		        }

		        for (const entity of world.entities) {
		          if (!entity || entity.isDead || entity.eliminated) continue;
		          if (grenade.position.y > entityHitY + grenade.radius) continue;
		          const dx = entity.position.x - grenade.position.x;
		          const dz = entity.position.z - grenade.position.z;
		          const dist = Math.hypot(dx, dz);
		          if (dist <= CONFIG.player.radius + grenade.radius) {
		            const nx = (grenade.position.x - entity.position.x) / Math.max(dist, 1e-6);
		            const nz = (grenade.position.z - entity.position.z) / Math.max(dist, 1e-6);
		            grenade.position.x = entity.position.x + nx * (CONFIG.player.radius + grenade.radius + 0.01);
		            grenade.position.z = entity.position.z + nz * (CONFIG.player.radius + grenade.radius + 0.01);
		            const dot = grenade.velocity.x * nx + grenade.velocity.z * nz;
		            grenade.velocity.x = (grenade.velocity.x - 2 * dot * nx) * 0.55;
		            grenade.velocity.z = (grenade.velocity.z - 2 * dot * nz) * 0.55;
		            entity.velocity.x -= nx * 1.4;
		            entity.velocity.z -= nz * 1.4;
		          }
		        }

		        const speed = Math.hypot(grenade.velocity.x, grenade.velocity.z) + Math.abs(grenade.velocity.y);
	        grenade.mesh.rotation.x += dt * (3.0 + speed * 0.2);
	        grenade.mesh.rotation.z += dt * (2.4 + speed * 0.15);
	        return true;
	      });
	    }


	    export function updateCoverStates(dt) {
	      world.cover.forEach((cover) => {
	        updateCoverFlash(cover, dt);
	        if (cover.active === false) return;
	        if (!cover.kickState || !cover.mesh) return;

        cover.mesh.position.addScaledVector(cover.kickState.velocity, dt);
        syncCoverColliderFromMesh(cover);
        cover.kickState.timer -= dt;

        const bounds = CONFIG.arena.bounds;
        const out =
          cover.mesh.position.x < bounds.minX ||
          cover.mesh.position.x > bounds.maxX ||
          cover.mesh.position.z < bounds.minZ ||
          cover.mesh.position.z > bounds.maxZ;
        if (out) {
          destroyCover(cover, cover.kickState.sourceTeam);
          return;
        }

        for (const other of world.cover) {
          if (other === cover) continue;
          if (other.active === false) continue;
          if (aabbOverlaps(cover, other)) {
            destroyCover(cover, cover.kickState.sourceTeam);
            return;
          }
        }

        for (const barrel of world.barrels) {
          if (!barrel.alive) continue;
          if (circleIntersectsAABB(barrel.position, barrel.radius, cover)) {
            barrel.lastDamagedByTeam = cover.kickState.sourceTeam;
            explodeBarrel(barrel);
            destroyCover(cover, cover.kickState.sourceTeam);
            return;
          }
        }

        const coverHitRadius = 0.55;
        for (const entity of world.entities) {
          if (!entity || entity.isDead || entity.eliminated) continue;
          if (circleIntersectsAABB(entity.position, coverHitRadius, cover)) {
            handleKickedCoverHit(entity, cover.kickState.sourceTeam, cover);
            return;
          }
        }

        if (cover.kickState.timer <= 0) {
          destroyCover(cover, cover.kickState.sourceTeam);
        }
      });
    }


    export function handleKickedCoverHit(entity, sourceTeam, cover) {
      const attacker = getEntityByTeam(sourceTeam);
      applyDamage(entity, CONFIG.kick.coverHitDamage, sourceTeam, attacker, null, cover.mesh?.position, entity.position);
      applyStun(entity, CONFIG.kick.coverHitStun);
      destroyCover(cover, sourceTeam);
    }


    export function aabbOverlaps(a, b) {
      return !(a.maxX < b.minX || a.minX > b.maxX || a.maxZ < b.minZ || a.minZ > b.maxZ);
    }


    export function circleIntersectsAABB(pos, radius, box) {
      const clampedX = THREE.MathUtils.clamp(pos.x, box.minX, box.maxX);
      const clampedZ = THREE.MathUtils.clamp(pos.z, box.minZ, box.maxZ);
      const dx = pos.x - clampedX;
      const dz = pos.z - clampedZ;
      return (dx * dx + dz * dz) <= radius * radius;
    }
