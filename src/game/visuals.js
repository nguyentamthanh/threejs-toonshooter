import * as THREE from 'three';
import { cacheCoverColliderOffsets } from './arena.js';
import { cloneAsset, findBuiltInWeapons, normalizeToHeight, removeFromArray, removeMixerEntry } from './assets.js';
import { COLORS, CONFIG } from './config.js';
import { visualToggleBtn, visualToggleLabel } from './dom.js';
import { setupAnimations, syncWeaponVisibility } from './entities.js';
import { showBanner } from './hud.js';
import { createCrateMesh, createGrenadeMesh, createPickupMesh } from './pickups.js';
import { assets, settings, world } from './state.js';

	    export function setupVisualToggle() {
	      if (!visualToggleBtn || !visualToggleLabel) return;
	      updateVisualToggleUI();
	      visualToggleBtn.addEventListener('click', () => {
	        setVisualMode(!settings.usePlaceholders);
	      });
	    }


	    export function updateVisualToggleUI() {
	      if (!visualToggleLabel) return;
	      visualToggleLabel.textContent = settings.usePlaceholders ? 'PLACEHOLDER' : 'GLTF';
	    }


	    export function setVisualMode(usePlaceholders) {
	      settings.usePlaceholders = Boolean(usePlaceholders);
	      localStorage.setItem('tinyToonDuel_visualMode', settings.usePlaceholders ? 'placeholder' : 'gltf');
	      updateVisualToggleUI();
	      if (assets.manifest) {
	        swapAllVisuals();
	        showBanner(settings.usePlaceholders ? 'VISUALS: PLACEHOLDERS' : 'VISUALS: GLTF');
	      }
	    }


	    export function markPlaceholder(root) {
	      if (!root) return root;
	      root.userData = root.userData || {};
	      root.userData.placeholder = true;
	      root.traverse?.((child) => {
	        child.userData = child.userData || {};
	        child.userData.placeholder = true;
	      });
	      return root;
	    }


	    export function swapAllVisuals() {
	      const variant = settings.usePlaceholders ? 'placeholder' : 'gltf';
	      world.entities.forEach((entity) => swapEntityVisual(entity, variant));
	      world.cover.forEach((cover) => swapCoverVisual(cover, variant));
	      world.barrels.forEach((barrel) => swapBarrelVisual(barrel, variant));
	      world.grenades.forEach((grenade) => swapGrenadeVisual(grenade, variant));
	      world.pickups.forEach((pickup) => swapPickupVisual(pickup, variant));
	      world.fallingCrates.forEach((crate) => swapFallingCrateVisual(crate, variant));
	      world.arenaDecor.forEach((item) => swapArenaDecorVisual(item, variant));

	      if (settings.usePlaceholders && world.spilledBarrels.length) {
	        world.spilledBarrels.forEach((mesh) => world.scene.remove(mesh));
	      }
	    }


	    export function ensureEntityVisual(entity, variant) {
	      if (!entity) return null;
	      entity.visuals = entity.visuals || { gltf: null, placeholder: null };
	      entity.visualAnimations = entity.visualAnimations || { gltf: [], placeholder: [] };
	      if (entity.visuals[variant]) return entity.visuals[variant];

	      if (variant === 'placeholder') {
	        const root = markPlaceholder(
	          new THREE.Mesh(
	            new THREE.CapsuleGeometry(0.35, 1.2, 6, 12),
	            new THREE.MeshStandardMaterial({ color: entity.color || 0xffffff })
	          )
	        );
	        root.castShadow = true;
	        root.receiveShadow = true;
	        entity.visuals.placeholder = root;
	        return root;
	      }

	      const clone = cloneAsset(entity.assetPath, { ignorePlaceholders: true });
	      if (!clone) return null;
	      const root = normalizeToHeight(clone.root, CONFIG.player.height);
	      root.traverse?.((child) => {
	        if (child.isMesh) {
	          child.castShadow = true;
	          child.receiveShadow = true;
	        }
	      });
	      entity.visuals.gltf = root;
	      entity.visualAnimations.gltf = clone.animations || [];
	      return root;
	    }


	    export function swapEntityVisual(entity, variant) {
	      if (!entity || !entity.group) return;
	      entity.activeVisual = entity.activeVisual || (entity.visuals?.gltf ? 'gltf' : 'placeholder');
	      if (entity.activeVisual === variant) return;
	      const nextRoot = ensureEntityVisual(entity, variant);
	      if (!nextRoot) return;

	      if (entity.root && entity.root.parent === entity.group) {
	        entity.group.remove(entity.root);
	      }
	      entity.group.add(nextRoot);
	      entity.root = nextRoot;
	      entity.activeVisual = variant;

	      if (entity.mixers) removeMixerEntry(entity.mixers);
	      entity.mixers = null;
	      entity.originalMaterials = null;
	      entity.flashTimer = 0;

	      entity.guns = findBuiltInWeapons(entity.root);
	      if (variant === 'gltf') {
	        entity.mixers = setupAnimations(entity.root, entity.visualAnimations?.gltf || []);
	      }
	      syncWeaponVisibility(entity);
	    }


	    export function ensureCoverVisual(cover, variant) {
	      if (!cover) return null;
	      cover.visuals = cover.visuals || { gltf: null, placeholder: null };
	      if (cover.visuals[variant]) return cover.visuals[variant];

	      if (variant === 'placeholder') {
	        const fb = world.arenaLayout?.fallbackSizes?.[cover.key];
	        const sizeX = fb?.[0] || Math.max(1, cover.maxX - cover.minX);
	        const sizeY = fb?.[1] || 1.2;
	        const sizeZ = fb?.[2] || Math.max(1, cover.maxZ - cover.minZ);
	        const root = markPlaceholder(
	          new THREE.Mesh(
	            new THREE.BoxGeometry(sizeX, sizeY, sizeZ),
	            new THREE.MeshStandardMaterial({ color: COLORS.steel, roughness: 0.7, metalness: 0.1 })
	          )
	        );
	        root.castShadow = true;
	        root.receiveShadow = true;
	        cover.visuals.placeholder = root;
	        return root;
	      }

	      const clone = cloneAsset(cover.assetPath, { ignorePlaceholders: true });
	      if (!clone) return null;
	      const root = normalizeToHeight(clone.root, null);
	      root.traverse?.((child) => {
	        if (child.isMesh) {
	          child.castShadow = true;
	          child.receiveShadow = true;
	        }
	      });
	      cover.visuals.gltf = root;
	      return root;
	    }


		    export function swapCoverVisual(cover, variant) {
		      if (!cover || !cover.mesh) return;
		      cover.activeVisual = cover.activeVisual || (cover.visuals?.gltf ? 'gltf' : 'placeholder');
		      if (cover.activeVisual === variant) return;
		      const nextMesh = ensureCoverVisual(cover, variant);
		      if (!nextMesh) return;

	      const oldMesh = cover.mesh;
	      const x = oldMesh.position.x;
	      const z = oldMesh.position.z;
	      const rotY = oldMesh.rotation.y;
	      const visible = oldMesh.visible;

	      world.scene.remove(oldMesh);
	      removeFromArray(world.arenaObjects, oldMesh);

	      if (variant === 'gltf') {
	        nextMesh.position.set(x, nextMesh.position.y, z);
	      } else {
	        nextMesh.position.set(x, nextMesh.geometry?.parameters?.height ? nextMesh.geometry.parameters.height / 2 : 0.6, z);
	      }
	      nextMesh.rotation.y = rotY;
	      nextMesh.visible = visible;

	      world.scene.add(nextMesh);
	      world.arenaObjects.push(nextMesh);

		      cover.mesh = nextMesh;
		      cover.activeVisual = variant;

		      cover.originalMaterials = null;
		      cover.flashTimer = 0;
		      cacheCoverColliderOffsets(cover);
		    }


	    export function ensureBarrelVisual(barrel, variant) {
	      if (!barrel) return null;
	      barrel.visuals = barrel.visuals || { gltf: null, placeholder: null };
	      if (barrel.visuals[variant]) return barrel.visuals[variant];

	      if (variant === 'placeholder') {
	        const root = markPlaceholder(
	          new THREE.Mesh(
	            new THREE.CylinderGeometry(0.45, 0.45, 1.2, 12),
	            new THREE.MeshStandardMaterial({ color: COLORS.warning, roughness: 0.4, metalness: 0.2 })
	          )
	        );
	        root.castShadow = true;
	        root.receiveShadow = true;
	        barrel.visuals.placeholder = root;
	        return root;
	      }

	      const clone = cloneAsset(barrel.assetPath, { ignorePlaceholders: true });
	      if (!clone) return null;
	      const root = normalizeToHeight(clone.root, null);
	      root.traverse?.((child) => {
	        if (child.isMesh) {
	          child.castShadow = true;
	          child.receiveShadow = true;
	        }
	      });
	      barrel.visuals.gltf = root;
	      return root;
	    }


	    export function swapBarrelVisual(barrel, variant) {
	      if (!barrel || !barrel.mesh) return;
	      barrel.activeVisual = barrel.activeVisual || (barrel.visuals?.gltf ? 'gltf' : 'placeholder');
	      if (barrel.activeVisual === variant) return;
	      const nextMesh = ensureBarrelVisual(barrel, variant);
	      if (!nextMesh) return;

	      const oldMesh = barrel.mesh;
	      const pos = oldMesh.position.clone();
	      const rot = oldMesh.rotation.clone();
	      const visible = oldMesh.visible;

	      world.scene.remove(oldMesh);

	      if (variant === 'gltf') {
	        nextMesh.position.set(pos.x, nextMesh.position.y, pos.z);
	      } else {
	        nextMesh.position.set(pos.x, 0.6, pos.z);
	      }
	      nextMesh.rotation.copy(rot);
	      nextMesh.visible = visible;

	      world.scene.add(nextMesh);
	      barrel.mesh = nextMesh;
	      barrel.position = nextMesh.position;
	      barrel.activeVisual = variant;
	    }


	    export function swapPickupVisual(pickup, variant) {
	      if (!pickup || !pickup.mesh) return;
	      pickup.activeVisual = pickup.activeVisual || (pickup.visuals?.gltf ? 'gltf' : 'placeholder');
	      if (pickup.activeVisual === variant) return;
	      const nextMesh = ensurePickupVisual(pickup, variant);
	      if (!nextMesh) return;

	      const oldMesh = pickup.mesh;
	      const pos = oldMesh.position.clone();
	      const rotY = oldMesh.rotation.y;

	      world.scene.remove(oldMesh);
	      nextMesh.position.copy(pos);
	      nextMesh.rotation.y = rotY;
	      world.scene.add(nextMesh);

	      pickup.mesh = nextMesh;
	      pickup.activeVisual = variant;
	    }


		    export function ensurePickupVisual(pickup, variant) {
		      pickup.visuals = pickup.visuals || { gltf: null, placeholder: null };
		      if (pickup.visuals[variant]) return pickup.visuals[variant];
		      const { mesh } = createPickupMesh(pickup.weaponId, { ignorePlaceholders: variant === 'gltf' });
		      pickup.visuals[variant] = mesh;
		      return mesh;
		    }


		    export function swapGrenadeVisual(grenade, variant) {
		      if (!grenade || !grenade.mesh) return;
		      grenade.activeVisual = grenade.activeVisual || (grenade.visuals?.gltf ? 'gltf' : 'placeholder');
		      if (grenade.activeVisual === variant) return;
		      const nextMesh = ensureGrenadeVisual(grenade, variant);
		      if (!nextMesh) return;

		      const oldMesh = grenade.mesh;
		      const pos = oldMesh.position.clone();
		      const rot = oldMesh.rotation.clone();
		      const visible = oldMesh.visible;

		      world.scene.remove(oldMesh);
		      nextMesh.position.copy(pos);
		      nextMesh.rotation.copy(rot);
		      nextMesh.visible = visible;
		      world.scene.add(nextMesh);

		      grenade.mesh = nextMesh;
		      grenade.position = nextMesh.position;
		      grenade.activeVisual = variant;
		    }


		    export function ensureGrenadeVisual(grenade, variant) {
		      grenade.visuals = grenade.visuals || { gltf: null, placeholder: null };
		      if (grenade.visuals[variant]) return grenade.visuals[variant];
		      const { mesh } = createGrenadeMesh({ ignorePlaceholders: variant === 'gltf' });
		      grenade.visuals[variant] = mesh;
		      return mesh;
		    }


		    export function swapFallingCrateVisual(crate, variant) {
		      if (!crate || !crate.mesh) return;
		      crate.activeVisual = crate.activeVisual || (crate.visuals?.gltf ? 'gltf' : 'placeholder');
		      if (crate.activeVisual === variant) return;
	      const nextMesh = ensureFallingCrateVisual(crate, variant);
	      if (!nextMesh) return;

	      const oldMesh = crate.mesh;
	      const pos = oldMesh.position.clone();
	      const rot = oldMesh.rotation.clone();

	      world.scene.remove(oldMesh);
	      nextMesh.position.copy(pos);
	      nextMesh.rotation.copy(rot);
	      world.scene.add(nextMesh);

	      crate.mesh = nextMesh;
	      crate.activeVisual = variant;
	    }


	    export function ensureFallingCrateVisual(crate, variant) {
	      crate.visuals = crate.visuals || { gltf: null, placeholder: null };
	      if (crate.visuals[variant]) return crate.visuals[variant];
	      const { mesh } = createCrateMesh({ ignorePlaceholders: variant === 'gltf' });
	      crate.visuals[variant] = mesh;
	      return mesh;
	    }


	    export function swapArenaDecorVisual(item, variant) {
	      if (!item || !item.mesh) return;
	      item.activeVisual = item.activeVisual || (item.visuals?.gltf ? 'gltf' : 'placeholder');
	      if (item.activeVisual === variant) return;
	      const nextMesh = ensureArenaDecorVisual(item, variant);
	      if (!nextMesh) return;

	      const oldMesh = item.mesh;
	      const x = oldMesh.position.x;
	      const z = oldMesh.position.z;
	      const rotY = oldMesh.rotation.y;

	      world.scene.remove(oldMesh);
	      removeFromArray(world.arenaObjects, oldMesh);

	      const y = item.kind === 'fence'
	        ? (variant === 'gltf' ? 0 : 0.55)
	        : nextMesh.position.y;
	      nextMesh.position.set(x, y, z);
	      nextMesh.rotation.y = rotY;

	      world.scene.add(nextMesh);
	      world.arenaObjects.push(nextMesh);

	      item.mesh = nextMesh;
	      item.activeVisual = variant;
	    }


	    export function ensureArenaDecorVisual(item, variant) {
	      item.visuals = item.visuals || { gltf: null, placeholder: null };
	      if (item.visuals[variant]) return item.visuals[variant];

	      if (variant === 'placeholder') {
	        if (item.kind === 'fence') {
	          const len = item.placeholderLength || (CONFIG.arena.width + 0.8);
	          const root = markPlaceholder(
	            new THREE.Mesh(
	              new THREE.BoxGeometry(len, 1.1, 0.18),
	              new THREE.MeshStandardMaterial({ color: COLORS.steel, roughness: 0.8, metalness: 0.05 })
	            )
	          );
	          root.castShadow = true;
	          root.receiveShadow = true;
	          root.position.y = 0.55;
	          item.visuals.placeholder = root;
	          return root;
	        }
	        const root = markPlaceholder(
	          new THREE.Mesh(
	            new THREE.BoxGeometry(0.9, 0.6, 0.9),
	            new THREE.MeshStandardMaterial({ color: COLORS.dustDark, roughness: 0.85, metalness: 0.05 })
	          )
	        );
	        root.castShadow = true;
	        root.receiveShadow = true;
	        root.position.y = 0.3;
	        item.visuals.placeholder = root;
	        return root;
	      }

	      const clone = cloneAsset(item.assetPath, { ignorePlaceholders: true });
	      if (!clone) return null;
	      const root = normalizeToHeight(clone.root, null);
	      root.traverse?.((child) => {
	        if (child.isMesh) {
	          child.castShadow = true;
	          child.receiveShadow = true;
	        }
	      });
	      if (item.kind === 'fence') root.scale.setScalar(1.1);
	      item.visuals.gltf = root;
	      return root;
	    }
