import * as THREE from 'three';
import { buildCoverNodes } from './arena.js';
import { cloneAsset, normalizeToHeight } from './assets.js';
import { distancePointToSegmentXZ, findBarrelHit, findClosestMiss, findClosestPlayerHit, findCoverHit, hasLineOfSight } from './collision.js';
import { COLORS, CONFIG } from './config.js';
import { getActiveWeaponConfig, getWeaponState, updateAnimationState } from './entities.js';
import { createSprite, flashCharacter, playDeathAnimation, setTimeScale, spawnCoverDebris, spawnExplosion, spawnExplosionSparks, spawnHitEffect, spawnTracer, triggerMuzzle, triggerRecoil, triggerShootAnimation } from './fx.js';
import { spawnPopup } from './hud.js';
import { getAiTuning } from './loop.js';
import { endMatch, endRound, triggerKillCam } from './match.js';
import { spawnWeaponPickup } from './pickups.js';
import { assets, fx, state, world } from './state.js';
import { getEntityByTeam, getFallbackOpponentTeam, moveToward } from './util.js';

    export function attemptFire(attacker, dir, isAI) {
      if (!attacker || attacker.isDead) return;
      if (attacker.weapon.switchTimer > 0) return;

      const weapon = getActiveWeaponConfig(attacker);
      const weaponState = getWeaponState(attacker);
      if (attacker.fireCooldown > 0 || weaponState.reloadTimer > 0) return;
      if (weaponState.ammo <= 0) return;

      const aiTuning = isAI ? (getAiTuning(attacker) || null) : null;
      const forwardBase = dir.clone().normalize();
      const rightBase = new THREE.Vector3(-forwardBase.z, 0, forwardBase.x);
      const origin = attacker.position.clone();
      origin.y = 1.05;
      origin.addScaledVector(forwardBase, 0.9);
      origin.addScaledVector(rightBase, 0.25);

      const pellets = weapon.pellets || 1;
      let didHit = false;
      let closestMissDist = Infinity;
      let closestMissEnd = null;
      let closestMissTarget = null;
      let knockApplied = false;

      for (let i = 0; i < pellets; i++) {
        const spreadBase = isAI ? weapon.spreadAI : weapon.spreadPlayer;
        const spread = spreadBase * (isAI ? (aiTuning?.aiSpreadMul ?? 1) : 1);
        const angle = (Math.random() - 0.5) * spread;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dir2 = new THREE.Vector3(
          forwardBase.x * cos - forwardBase.z * sin,
          0,
          forwardBase.x * sin + forwardBase.z * cos
        );

        const end = origin.clone().addScaledVector(dir2, weapon.range);
        const coverHit = findCoverHit(origin, end);
        const targetHit = findClosestPlayerHit(origin, end, attacker);
        const barrelHit = findBarrelHit(origin, end);

        let hitType = null;
        let hit = null;
        let hitT = null;

        if (coverHit) {
          hitType = 'cover';
          hit = coverHit.cover;
          hitT = coverHit.t;
        }

        if (targetHit && (hitT === null || targetHit.t < hitT)) {
          hitType = 'player';
          hit = targetHit.entity;
          hitT = targetHit.t;
        }

        if (barrelHit && (hitT === null || barrelHit.t < hitT)) {
          hitType = 'barrel';
          hit = barrelHit.barrel;
          hitT = barrelHit.t;
        }

        const endT = hitT !== null ? hitT : 1;
        const shotEnd = origin.clone().lerp(end, endT);

        const isShotgun = pellets > 1;
        const drawTracer = isShotgun || pellets === 1 || i < 3;
        if (drawTracer) {
          if (isShotgun) {
            spawnTracer(origin, shotEnd, 0xfff1cc, 0.09, { additive: true, opacity: 0.92 });
          } else {
            spawnTracer(origin, shotEnd, weapon.tracer, 0.06, { additive: true, opacity: 0.8 });
          }
        }

        if (hitType === 'player') {
          didHit = true;
          const damage = weapon.damage * (isAI ? (aiTuning?.aiDamageMul ?? 1) : 1);
          applyDamage(hit, damage, attacker.team, attacker, weapon, origin, shotEnd);
          if (!knockApplied) {
            applyKnockback(hit, attacker.position, weapon.knockback);
            knockApplied = true;
          }
        } else if (hitType === 'barrel') {
          didHit = true;
          applyBarrelDamage(hit, weapon.damage, attacker.team);
        } else if (hitType === 'cover') {
          didHit = true;
          applyCoverDamage(hit, weapon.damage, attacker.team);
        } else {
          const miss = findClosestMiss(origin, shotEnd, attacker);
          if (miss && miss.dist < closestMissDist) {
            closestMissDist = miss.dist;
            closestMissEnd = shotEnd.clone();
            closestMissTarget = miss.entity;
          }
        }
      }

      triggerMuzzle(attacker, forwardBase, weapon);
      triggerRecoil();
      triggerShootAnimation(attacker);
      attacker.firedRecentlyTimer = 0.25;

      const fireRateBase = isAI ? weapon.fireRateAI : weapon.fireRate;
      const fireRate = fireRateBase * (isAI ? (aiTuning?.aiFireRateMul ?? 1) : 1);
      attacker.fireCooldown = 1 / fireRate;
      weaponState.ammo -= 1;

      if (!didHit && closestMissEnd && closestMissTarget) {
        checkNearMiss(origin, closestMissEnd, closestMissTarget);
      }
    }


    export function startReload(entity) {
      if (!entity || entity.isDead) return;
      if (entity.stunTimer > 0) return;
      if (entity.weapon.switchTimer > 0) return;
      const weapon = getActiveWeaponConfig(entity);
      const state = getWeaponState(entity);
      if (state.reloadTimer > 0) return;
      if (state.ammo >= weapon.magSize) return;
      if (state.reserve <= 0) return;
      state.reloadTimer = weapon.reload;
      updateAnimationState(entity, 'reload');
    }


    export function updateReload(entity, dt) {
      if (!entity || entity.isDead) return;
      const weapon = getActiveWeaponConfig(entity);
      const state = getWeaponState(entity);
      if (state.reloadTimer <= 0) return;
      state.reloadTimer -= dt;
      if (state.reloadTimer > 0) return;

      if (weapon.reloadType === 'shell') {
        if (state.reserve <= 0) {
          state.reloadTimer = 0;
          return;
        }
        state.ammo = Math.min(weapon.magSize, state.ammo + 1);
        state.reserve = Math.max(0, state.reserve - 1);
        if (state.ammo < weapon.magSize && state.reserve > 0) {
          state.reloadTimer = weapon.reload;
        } else {
          state.reloadTimer = 0;
        }
      } else {
        const needed = weapon.magSize - state.ammo;
        const take = Math.min(needed, state.reserve);
        state.ammo += take;
        state.reserve = Math.max(0, state.reserve - take);
        state.reloadTimer = 0;
      }
    }


    export function applyDamage(target, amount, sourceTeam, attacker = null, weapon = null, shotStart = null, shotEnd = null) {
      if (target.isDead) return;
      if (state.suddenDeath) {
        target.hp = 0;
      } else {
        target.hp = Math.max(0, target.hp - amount);
      }
      fx.hitFlashTimer = 0.06;
      fx.hitstopTimer = 0.06;

      // Spawn hit effect at target position
      spawnHitEffect(target.position, target.team);
      // Flash the character red briefly
      flashCharacter(target, 0.15);

      if (target.hp <= 0) {
        handleEntityDeath(target, sourceTeam, attacker, shotStart, shotEnd);
      }
    }


    export function handleEntityDeath(target, sourceTeam, attacker, shotStart, shotEnd) {
      target.isDead = true;
      playDeathAnimation(target);
      // Bigger hit effect on death
      spawnHitEffect(target.position, target.team, true);
      fx.shakeTime = 0.3;
      fx.shakeIntensity = 0.55;
      if (attacker) {
        state.lastKill = {
          shooterTeam: attacker.team,
          victimTeam: target.team,
          shooterPos: attacker.position.clone(),
          victimPos: target.position.clone(),
          shotStart: shotStart ? shotStart.clone() : null,
          shotEnd: shotEnd ? shotEnd.clone() : null,
          weaponId: attacker.weapon.id
        };
      } else {
        state.lastKill = null;
      }

      if (state.gameMode === 'deathmatch') {
        handleDeathmatchDeath(target);
      } else {
        endRound(sourceTeam, false);
      }
    }


    export function handleDeathmatchDeath(target) {
      target.lives = Math.max(0, (target.lives ?? 0) - 1);
      const popupPos = target.position.clone();
      popupPos.y = 2.2;

      if (target.lives <= 0) {
        target.eliminated = true;
        spawnPopup('ELIMINATED', popupPos, 'close', 0.9);
      } else {
        target.respawnTimer = 1.2;
        spawnPopup(`RESPAWN ${target.lives}`, popupPos, 'close', 0.7);
      }

      const survivors = world.entities.filter((entity) => entity && !entity.eliminated);
      if (survivors.length <= 1) {
        const winnerTeam = survivors[0]?.team;
        if (state.lastKill && winnerTeam) {
          triggerKillCam(winnerTeam);
        } else {
          endMatch(winnerTeam);
        }
      }
    }


    export function applyKnockback(target, attackerPos, strength) {
      if (!target || target.isDead) return;
      if (!strength || strength <= 0) return;
      const dir = target.position.clone().sub(attackerPos);
      dir.y = 0;
      if (dir.lengthSq() < 0.001) return;
      dir.normalize();
      target.velocity.addScaledVector(dir, strength * 3.0);
    }


    export function applyStun(entity, duration) {
      if (!entity || entity.isDead) return;
      if (!duration || duration <= 0) return;
      const wasStunned = entity.stunTimer > 0;
      entity.stunTimer = Math.max(entity.stunTimer, duration);
      if (!wasStunned) triggerStunReaction(entity);
    }


    export function triggerStunReaction(entity) {
      if (!entity || entity.isDead) return;
      if (entity.mixers?.actions?.hit) {
        updateAnimationState(entity, 'hit');
      } else {
        // Fallback: tilt the whole character group to sell the knockdown.
        entity.stunTilt = Math.min(entity.stunTilt, -0.15);
      }
    }


    export function updateStunVisual(entity, dt) {
      if (!entity || !entity.group) return;
      const hasHitClip = Boolean(entity.mixers?.actions?.hit);
      if (hasHitClip) {
        entity.group.rotation.x = moveToward(entity.group.rotation.x, 0, dt * 8);
        return;
      }
      const target = entity.stunTimer > 0 ? -0.6 : 0;
      entity.stunTilt = moveToward(entity.stunTilt || 0, target, dt * 5.5);
      entity.group.rotation.x = entity.stunTilt;
    }


    export function applyCoverDamage(cover, amount, sourceTeam) {
      if (!cover || cover.active === false) return;
      if (!cover.destructible) return;
      cover.hp = Math.max(0, cover.hp - amount);
      flashCover(cover, CONFIG.cover.flashTime);
      if (cover.hp <= 0) {
        destroyCover(cover, sourceTeam);
      }
    }


    export function destroyCover(cover, sourceTeam) {
      if (!cover || cover.active === false) return;
      cover.active = false;
      if (cover.mesh) cover.mesh.visible = false;
      spawnCoverDebris(cover, sourceTeam);
      maybeSpawnCoverPickup(cover);
      buildCoverNodes();
    }


    export function maybeSpawnCoverPickup(cover) {
      if (!cover || !cover.destructible) return;
      if (Math.random() > CONFIG.pickups.crateDropChance) return;
      const weaponId = rollWeaponDrop();
      if (!weaponId) return;
      const pos = cover.mesh
        ? cover.mesh.position.clone()
        : new THREE.Vector3((cover.minX + cover.maxX) / 2, 0, (cover.minZ + cover.maxZ) / 2);
      spawnWeaponPickup(pos, weaponId);
    }


    export function rollWeaponDrop() {
      const entries = Object.entries(CONFIG.weapons);
      const total = entries.reduce((sum, [, cfg]) => sum + (cfg.dropChance || 0), 0);
      if (total <= 0) return null;
      let roll = Math.random() * total;
      for (const [weaponId, cfg] of entries) {
        roll -= cfg.dropChance || 0;
        if (roll <= 0) return weaponId;
      }
      return entries[0]?.[0] || null;
    }


    export function flashCover(cover, duration) {
      if (!cover.mesh) return;
      cover.flashTimer = duration;
      if (!cover.originalMaterials) {
        cover.originalMaterials = [];
        cover.mesh.traverse((child) => {
          if (child.isMesh && child.material) {
            cover.originalMaterials.push({ mesh: child, material: child.material });
          }
        });
      }
      const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      cover.mesh.traverse((child) => {
        if (child.isMesh) child.material = flashMat;
      });
    }


    export function updateCoverFlash(cover, dt) {
      if (!cover.flashTimer || cover.flashTimer <= 0) return;
      cover.flashTimer -= dt;
      if (cover.flashTimer <= 0 && cover.originalMaterials) {
        cover.originalMaterials.forEach(({ mesh, material }) => {
          mesh.material = material;
        });
      }
    }


    export function applyBarrelDamage(barrel, amount, sourceTeam = null) {
      if (!barrel.alive) return;
      if (sourceTeam) barrel.lastDamagedByTeam = sourceTeam;
      barrel.hp -= amount;
      if (barrel.hp <= 0) {
        explodeBarrel(barrel);
      }
    }


    export function explodeBarrel(barrel) {
      barrel.alive = false;
      barrel.mesh.visible = false;
      barrel.isRolling = false;
      barrel.rollTimer = 0;
      spawnExplosion(barrel.position);
      fx.shakeTime = 0.22;
      fx.shakeIntensity = 0.35;

      const sourceTeam = barrel.lastDamagedByTeam || null;
      const attacker = sourceTeam ? getEntityByTeam(sourceTeam) : null;

      world.entities.forEach((entity) => {
        const dist = barrel.position.distanceTo(entity.position);
        if (dist > CONFIG.barrel.explosionRadius) return;
        const falloff = 1 - dist / CONFIG.barrel.explosionRadius;
        const dmg = CONFIG.barrel.maxDamage * falloff;
        if (dmg > 0) {
          const creditTeam = sourceTeam || getFallbackOpponentTeam(entity.team);
          applyDamage(entity, dmg, creditTeam, attacker, null, barrel.position, entity.position);
        }
        const knockDir = entity.position.clone().sub(barrel.position).normalize();
        entity.velocity.addScaledVector(knockDir, 10 * falloff);
        applyStun(entity, 0.55 * falloff);
      });

      const spilledPath = assets.manifest.assets.toonshooter.environment.ExplodingBarrel_Spilled;
      const spilledClone = cloneAsset(spilledPath);
	      if (spilledClone) {
	        const root = normalizeToHeight(spilledClone.root, null);
	        root.position.copy(barrel.position);
	        world.scene.add(root);
        // Track this mesh so we can remove it on round reset
        world.spilledBarrels.push(root);
        barrel.spilledMesh = root; // Also link it to the barrel
	      }
	    }


	    export function explodeGrenade(grenade) {
	      if (!grenade) return;
	      const pos = grenade.position ? grenade.position.clone() : grenade.mesh?.position?.clone?.();
	      if (!pos) return;

	      spawnExplosion(pos);
	      spawnExplosionSparks(pos, 18, 0xffb13d);

	      const blast = createSprite(0xffb13d, 2.6);
	      blast.material.blending = THREE.AdditiveBlending;
	      blast.material.depthWrite = false;
	      blast.position.copy(pos).add(new THREE.Vector3(0, 0.9, 0));
	      blast.userData.life = 0.16;
	      world.scene.add(blast);
	      world.fxSprites.push(blast);

	      const smoke2 = createSprite(0x3a3a3a, 3.4);
	      smoke2.position.copy(pos).add(new THREE.Vector3(0, 1.2, 0));
	      smoke2.userData.life = 0.52;
	      world.scene.add(smoke2);
	      world.fxSprites.push(smoke2);

	      fx.hitstopTimer = Math.max(fx.hitstopTimer, 0.085);
	      setTimeScale(0.62, 0.16);
	      fx.fovPulse = Math.max(fx.fovPulse, 1.25);
	      fx.shakeTime = Math.max(fx.shakeTime, 0.42);
	      fx.shakeIntensity = Math.max(fx.shakeIntensity, 0.85);

	      const sourceTeam = grenade.sourceTeam || null;
	      const attacker = sourceTeam ? getEntityByTeam(sourceTeam) : null;
	      const radius = CONFIG.grenade.explosionRadius;
	      const maxDamage = CONFIG.grenade.maxDamage;
	      const maxKnock = CONFIG.grenade.knockback;
	      const maxStun = CONFIG.grenade.stun;

      world.entities.forEach((entity) => {
        if (!entity || entity.isDead || entity.eliminated) return;
	        const dx = entity.position.x - pos.x;
	        const dz = entity.position.z - pos.z;
	        const dist = Math.hypot(dx, dz);
	        if (dist > radius) return;

	        let falloff = 1 - dist / radius;
	        if (!hasLineOfSight(pos, entity.position)) falloff *= 0.7;
	        if (falloff <= 0) return;

	        const creditTeam = sourceTeam && entity.team !== sourceTeam ? sourceTeam : getFallbackOpponentTeam(entity.team);
	        const creditedAttacker = sourceTeam && entity.team !== sourceTeam ? attacker : null;

	        const dmg = maxDamage * falloff;
	        if (dmg > 0.5) {
	          applyDamage(entity, dmg, creditTeam, creditedAttacker, null, pos, entity.position);
	        }

        const dir = new THREE.Vector3(dx, 0, dz);
        if (dir.lengthSq() > 1e-6) dir.normalize();
        const oomph = (0.65 + 0.6 * falloff);
        entity.velocity.addScaledVector(dir, maxKnock * falloff * oomph);
        applyStun(entity, maxStun * falloff);
      });

	      world.barrels.forEach((barrel) => {
	        if (!barrel.alive) return;
	        const dist = barrel.position.distanceTo(pos);
	        if (dist > radius) return;
	        const falloff = 1 - dist / radius;
	        if (falloff <= 0) return;
	        applyBarrelDamage(barrel, CONFIG.barrel.hp * 1.2 * falloff, sourceTeam);
	      });

	      world.cover.forEach((cover) => {
	        if (cover.active === false) return;
	        if (!cover.destructible) return;
	        const center = cover.mesh?.position || null;
	        if (!center) return;
	        const dist = center.distanceTo(pos);
	        if (dist > radius) return;
	        const falloff = 1 - dist / radius;
	        if (falloff <= 0) return;
	        applyCoverDamage(cover, maxDamage * 0.45 * falloff, sourceTeam || null);
	      });

	      if (grenade.mesh) world.scene.remove(grenade.mesh);
	      grenade.mesh = null;
	    }


	    export function checkNearMiss(start, end, target) {
	      if (target.nearMissCooldown > 0) return;
	      const dist = distancePointToSegmentXZ(target.position, start, end);
	      if (dist <= CONFIG.nearMissDrama.distance) {
        fx.nearMissTimer = 0.22;
        fx.dramaticTimer = CONFIG.nearMissDrama.duration;
        fx.dramaticTeam = target.team;
        setTimeScale(CONFIG.nearMissDrama.timeScale, CONFIG.nearMissDrama.duration);
        target.dashCooldown = 0;
        target.nearMissCooldown = CONFIG.nearMissDrama.cooldown;

        // Extra trail to highlight the near-miss bullet.
        spawnTracer(start, end, COLORS.near, CONFIG.nearMissDrama.duration);

        const popupPos = target.position.clone();
        popupPos.y = 1.9;
        spawnPopup('CLOSE!', popupPos, 'close', 0.6);
      }
    }
