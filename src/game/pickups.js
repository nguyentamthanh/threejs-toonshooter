import * as THREE from 'three';
import { cloneAsset, normalizeToHeight } from './assets.js';
import { rollWeaponDrop, startReload } from './combat.js';
import { COLORS, CONFIG } from './config.js';
import { getWeaponState } from './entities.js';
import { emit } from './events.js';
import { spawnPopup } from './hud.js';
import { assets, fx, state, world } from './state.js';
import { markPlaceholder } from './visuals.js';

	    export function spawnWeaponPickup(position, weaponId) {
	      const weapon = CONFIG.weapons[weaponId];
	      if (!weapon) return;
	      const { mesh, activeVisual } = createPickupMesh(weaponId);
	      mesh.position.copy(position);
	      const pickup = {
	        weaponId,
	        mesh,
	        visuals: (() => {
	          const visuals = { gltf: null, placeholder: null };
	          visuals[activeVisual] = mesh;
	          return visuals;
	        })(),
	        activeVisual,
	        basePos: position.clone(),
	        bobTimer: Math.random() * Math.PI * 2
	      };
	      world.scene.add(mesh);
	      world.pickups.push(pickup);
	    }


	    export function createPickupMesh(weaponId, { ignorePlaceholders = false } = {}) {
	      const group = new THREE.Group();
	      const manifest = assets.manifest.assets.toonshooter;
	      const weapon = CONFIG.weapons[weaponId];
	      const gunPath = weapon ? manifest.guns[weapon.model] : null;
	      const clone = gunPath ? cloneAsset(gunPath, { ignorePlaceholders }) : null;
	      const activeVisual = clone ? 'gltf' : 'placeholder';
	      if (clone) {
	        const gun = normalizeToHeight(clone.root, 0.55);
	        gun.rotation.y = Math.PI / 2;
	        gun.position.y = 0.4;
	        group.add(gun);
	      } else {
	        const fallback = new THREE.Mesh(
	          new THREE.BoxGeometry(0.6, 0.2, 0.8),
	          new THREE.MeshStandardMaterial({ color: COLORS.steel, roughness: 0.5, metalness: 0.2 })
	        );
	        fallback.position.y = 0.4;
	        markPlaceholder(fallback);
	        group.add(fallback);
	      }

      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.08, 18),
        new THREE.MeshStandardMaterial({
          color: weapon?.color ?? 0xff8a3d,
          roughness: 0.4,
          metalness: 0.1,
          emissive: 0x111111
        })
      );
	      ring.position.y = 0.04;
	      group.add(ring);
	      return { mesh: group, activeVisual };
	    }


    export function updatePickups(dt) {
      if (world.pickups.length === 0) return;
      const bobHeight = CONFIG.pickups.floatHeight;
      const bobAmt = CONFIG.pickups.bobAmount;
      const bobSpeed = CONFIG.pickups.bobSpeed;
      const spin = CONFIG.pickups.rotateSpeed;
      const radius = CONFIG.pickups.collectRadius;

      world.pickups = world.pickups.filter((pickup) => {
        pickup.bobTimer += dt * bobSpeed;
        pickup.mesh.position.y = pickup.basePos.y + bobHeight + Math.sin(pickup.bobTimer) * bobAmt;
        pickup.mesh.rotation.y += spin * dt;

        for (const entity of world.entities) {
          if (!entity || entity.isDead) continue;
          if (entity.position.distanceTo(pickup.mesh.position) <= radius) {
            collectPickup(entity, pickup);
            world.scene.remove(pickup.mesh);
            return false;
          }
        }
        return true;
      });
    }


    export function collectPickup(entity, pickup) {
      const weaponId = pickup.weaponId;
      const weapon = CONFIG.weapons[weaponId];
      const state = getWeaponState(entity, weaponId);
      if (!weapon || !state) return;
      const wasLocked = !state.unlocked;
      state.unlocked = true;
      if (wasLocked) {
        state.ammo = weapon.magSize;
      }
      const addAmount = getPickupAmmoAmount(weaponId);
      state.reserve = Math.min(weapon.reserveMax, state.reserve + addAmount);
      emit('pickup', { entity, weaponId });
      if (entity.weapon.id === weaponId && state.ammo < weapon.magSize && state.reloadTimer <= 0) {
        startReload(entity);
      }
      if (entity.isPlayer) {
        const popupPos = entity.position.clone();
        popupPos.y = 2.2;
        spawnPopup(`${weapon.name.toUpperCase()} +${addAmount}`, popupPos, 'close', 0.7);
      }
    }


    export function getPickupAmmoAmount(weaponId) {
      const weapon = CONFIG.weapons[weaponId];
      if (!weapon) return 0;
      return Math.ceil(weapon.reserveMax * 0.4);
    }


    export function clearPickups() {
      world.pickups.forEach((pickup) => {
        world.scene.remove(pickup.mesh);
      });
      world.pickups = [];
      world.fallingCrates.forEach((crate) => {
        world.scene.remove(crate.mesh);
      });
      world.fallingCrates = [];
    }


    export function clearGrenades() {
      world.grenades.forEach((grenade) => {
        if (grenade && grenade.mesh) world.scene.remove(grenade.mesh);
      });
      world.grenades = [];
    }


    export function updateSkyDrops(dt) {
      world.skyDropTimer -= dt;
      if (world.skyDropTimer > 0) return;
      const bounds = CONFIG.arena.bounds;
      const margin = 2.5;
      const x = THREE.MathUtils.randFloat(bounds.minX + margin, bounds.maxX - margin);
      const z = THREE.MathUtils.randFloat(bounds.minZ + margin, bounds.maxZ - margin);
      spawnFallingCrate(new THREE.Vector3(x, 0, z));
      world.skyDropTimer = CONFIG.pickups.skyDropInterval
        + (Math.random() * 2 - 1) * CONFIG.pickups.skyDropVariance;
    }


	    export function spawnFallingCrate(position) {
	      const { mesh, activeVisual } = createCrateMesh();
	      mesh.position.set(position.x, 12, position.z);
	      const weaponId = rollWeaponDrop();
	      const entry = {
	        mesh,
	        visuals: (() => {
	          const visuals = { gltf: null, placeholder: null };
	          visuals[activeVisual] = mesh;
	          return visuals;
	        })(),
	        activeVisual,
	        weaponId,
	        velocity: new THREE.Vector3(0, -4, 0)
	      };
	      world.scene.add(mesh);
	      world.fallingCrates.push(entry);
	    }


		    export function createCrateMesh({ ignorePlaceholders = false } = {}) {
		      const manifest = assets.manifest.assets.toonshooter;
		      const cratePath = manifest.environment.Crate;
		      const clone = cratePath ? cloneAsset(cratePath, { ignorePlaceholders }) : null;
	      const activeVisual = clone ? 'gltf' : 'placeholder';
	      if (clone) {
	        const root = normalizeToHeight(clone.root, null);
	        root.traverse?.((child) => {
	          if (child.isMesh) {
	            child.castShadow = true;
	            child.receiveShadow = true;
	          }
	        });
	        return { mesh: root, activeVisual };
	      }
	      const root = markPlaceholder(new THREE.Mesh(
	        new THREE.BoxGeometry(1.2, 1.2, 1.2),
	        new THREE.MeshStandardMaterial({ color: COLORS.dustDark, roughness: 0.8, metalness: 0.05 })
	      ));
		      return { mesh: root, activeVisual };
		    }


		    export function createGrenadeMesh({ ignorePlaceholders = false } = {}) {
		      const group = new THREE.Group();
		      const manifest = assets.manifest.assets.toonshooter;
		      const grenadePath = manifest.guns.Grenade;
		      const clone = grenadePath ? cloneAsset(grenadePath, { ignorePlaceholders }) : null;
		      const activeVisual = clone ? 'gltf' : 'placeholder';

		      if (clone) {
		        const grenade = normalizeToHeight(clone.root, 0.32);
		        grenade.rotation.y = Math.PI / 2;
		        grenade.position.y = 0.12;
		        grenade.traverse?.((child) => {
		          if (child.isMesh) {
		            child.castShadow = true;
		            child.receiveShadow = true;
		          }
		        });
		        group.add(grenade);
		      } else {
		        const fallback = markPlaceholder(new THREE.Mesh(
		          new THREE.IcosahedronGeometry(0.14, 0),
		          new THREE.MeshStandardMaterial({
		            color: COLORS.warning,
		            roughness: 0.35,
		            metalness: 0.2,
		            emissive: 0x221100
		          })
		        ));
		        fallback.castShadow = true;
		        fallback.receiveShadow = true;
		        group.add(fallback);
		      }

		      return { mesh: group, activeVisual };
		    }


	    export function updateFallingCrates(dt) {
	      if (world.fallingCrates.length === 0) return;
	      const gravity = -18;
	      world.fallingCrates = world.fallingCrates.filter((crate) => {
        crate.velocity.y += gravity * dt;
        crate.mesh.position.addScaledVector(crate.velocity, dt);
        if (crate.mesh.position.y <= 0.6) {
          crate.mesh.position.y = 0.6;
          fx.shakeTime = 0.25;
          fx.shakeIntensity = 0.45;
          if (crate.weaponId) {
            spawnWeaponPickup(crate.mesh.position.clone(), crate.weaponId);
          }
          world.scene.remove(crate.mesh);
          return false;
        }
        return true;
      });
    }
