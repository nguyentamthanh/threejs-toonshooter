import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { assets, settings, world } from './state.js';

    export async function loadAssets() {
      const response = await fetch('../assets.json');
      assets.manifest = await response.json();

      const manifest = assets.manifest.assets.toonshooter;
	      const requests = [
	        // Characters
	        manifest.characters.Character_Soldier,
	        manifest.characters.Character_Enemy,
	        manifest.characters.Character_Hazmat,
	        // Guns (pickup models for every configured weapon)
	        ...Object.values(CONFIG.weapons).map((weapon) => manifest.guns[weapon.model]),
	        manifest.guns.Grenade,
	        // Hazards
	        manifest.environment.Landmine,
	        manifest.environment.BearTrap_Open,
	        manifest.environment.BearTrap_Closed,
	        // Main cover
	        manifest.environment.Tank,
	        manifest.environment.Debris_BrokenCar,
	        manifest.environment.Container_Small,
        manifest.environment.Barrier_Large,
        manifest.environment.Crate,
        manifest.environment.SackTrench,
        manifest.environment.Sofa,
        manifest.environment.Structure_1,
        manifest.environment.Pallet,
        // Decorative
        manifest.environment.CardboardBoxes_1,
        manifest.environment.CardboardBoxes_2,
        manifest.environment.CardboardBoxes_3,
        manifest.environment.CardboardBoxes_4,
        manifest.environment.Debris_Tires,
        manifest.environment.TrafficCone,
        manifest.environment.Debris_Pile,
        manifest.environment.Debris_Papers_1,
        manifest.environment.Debris_Papers_2,
        manifest.environment.Debris_Papers_3,
        manifest.environment.GasCan,
        manifest.environment.WoodPlanks,
        manifest.environment.Pallet_Broken,
        manifest.environment.Pipes,
        manifest.environment.TrashContainer,
        manifest.environment.TrashContainer_Open,
        manifest.environment.StreetLight,
        manifest.environment.Sign,
        // Boundary
        manifest.environment.Fence_Long,
        // Barrels
        manifest.environment.ExplodingBarrel,
        manifest.environment.ExplodingBarrel_Spilled
      ].filter(Boolean); // Filter out any undefined paths

      await Promise.all(requests.map(path => loadGltf(path)));
    }


	    export async function loadGltf(path) {
	      if (assets.cache.has(path)) return assets.cache.get(path);

	      const url =
	        (typeof path === 'string' && !(path.startsWith('http') || path.startsWith('../') || path.startsWith('/')))
	          ? `../${path}`
	          : path;

	      const loader = new GLTFLoader();
	      const entry = await new Promise((resolve) => {
	        loader.load(
	          url,
	          (gltf) => {
	            const root = gltf.scene;
	            let hasSkinned = false;
	            root.traverse((child) => {
	              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
              if (child.isSkinnedMesh) hasSkinned = true;
            });
            resolve({ scene: root, animations: gltf.animations || [], hasSkinned });
          },
          undefined,
          () => {
            resolve({ scene: null, animations: [], hasSkinned: false, failed: true });
          }
        );
      });

      assets.cache.set(path, entry);
      return entry;
    }


	    export function cloneAsset(path, { ignorePlaceholders = false } = {}) {
	      if (!ignorePlaceholders && settings.usePlaceholders) return null;
	      const entry = assets.cache.get(path);
	      if (!entry || entry.failed || !entry.scene) return null;
	      if (entry.hasSkinned || entry.animations.length) {
	        return { root: SkeletonUtils.clone(entry.scene), animations: entry.animations };
	      }
	      return { root: entry.scene.clone(true), animations: entry.animations };
	    }


	    export function removeFromArray(arr, item) {
	      const idx = arr.indexOf(item);
	      if (idx >= 0) arr.splice(idx, 1);
	    }


	    export function removeMixerEntry(entry) {
	      if (!entry) return;
	      entry.mixer?.stopAllAction?.();
	      removeFromArray(world.mixers, entry);
	    }


    export function computeMeshBounds(root) {
      const box = new THREE.Box3();
      root.updateMatrixWorld(true);
      root.traverse((child) => {
        if (child.isMesh && child.geometry) {
          child.geometry.computeBoundingBox();
          const childBox = child.geometry.boundingBox.clone();
          childBox.applyMatrix4(child.matrixWorld);
          box.union(childBox);
        }
      });
      return box;
    }


    export function normalizeToHeight(root, targetHeight) {
      root.position.set(0, 0, 0);
      root.rotation.set(0, 0, 0);
      root.scale.set(1, 1, 1);
      root.updateMatrixWorld(true);

      const box = computeMeshBounds(root);
      if (box.isEmpty()) box.setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      if (targetHeight && size.y > 0) {
        const scale = targetHeight / size.y;
        root.scale.setScalar(scale);
        root.updateMatrixWorld(true);
      }

      const box2 = computeMeshBounds(root);
      if (box2.isEmpty()) box2.setFromObject(root);
      root.position.y -= box2.min.y;
      root.updateMatrixWorld(true);
      return root;
    }


    export function findBuiltInWeapons(root) {
      // Each weapon's `node` is the exact name of its gun mesh in the character glTF.
      const nodeToWeapon = new Map(
        Object.entries(CONFIG.weapons).map(([weaponId, weapon]) => [weapon.node.toLowerCase(), weaponId])
      );
      const otherWeaponKeywords = ['ak', 'revolver', 'knife', 'shovel', 'sniper', 'grenade', 'launcher', 'cannon', 'rocket'];
      const found = {};
      root.traverse((child) => {
        const name = (child.name || '').toLowerCase();
        const weaponId = nodeToWeapon.get(name);
        if (weaponId) {
          found[weaponId] = child;
          child.visible = false;
          return;
        }
        // Hide other weapons we don't use
        if (otherWeaponKeywords.some(k => name.includes(k))) {
          child.visible = false;
        }
      });
      return found;
    }
