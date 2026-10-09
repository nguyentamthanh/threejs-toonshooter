import * as THREE from 'three';
import { cloneAsset, computeMeshBounds, normalizeToHeight } from './assets.js';
import { BASE_ARENA, COLORS, CONFIG } from './config.js';
import { clearGrenades } from './pickups.js';
import { assets, world } from './state.js';
import { markPlaceholder } from './visuals.js';

	    export function clearArena() {
	      world.cover.forEach((cover) => {
	        if (cover.mesh) world.scene.remove(cover.mesh);
	      });
      world.barrels.forEach((barrel) => {
        if (barrel.mesh) world.scene.remove(barrel.mesh);
      });
      clearGrenades();
      world.spilledBarrels.forEach((mesh) => {
        world.scene.remove(mesh);
      });
	      world.arenaObjects.forEach((obj) => {
	        world.scene.remove(obj);
	      });
	      world.arenaDecor.forEach((item) => {
	        if (item && item.mesh) world.scene.remove(item.mesh);
	      });
	      world.cover = [];
	      world.barrels = [];
	      world.spilledBarrels = [];
	      world.nodes = [];
	      world.arenaObjects = [];
	      world.arenaDecor = [];
	      world.arenaLayout = null;
	    }


    export function buildArena() {
      const manifest = assets.manifest.assets.toonshooter;
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(BASE_ARENA.ground.width * (CONFIG.arena.width / BASE_ARENA.width), BASE_ARENA.ground.depth * (CONFIG.arena.depth / BASE_ARENA.depth)),
        new THREE.MeshStandardMaterial({ color: COLORS.dust, roughness: 0.9, metalness: 0.05 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      world.scene.add(ground);
      world.arenaObjects.push(ground);

	      const border = new THREE.LineSegments(
	        new THREE.EdgesGeometry(new THREE.PlaneGeometry(CONFIG.arena.width, CONFIG.arena.depth)),
	        new THREE.LineBasicMaterial({ color: COLORS.dustDark })
	      );
	      border.rotation.x = -Math.PI / 2;
	      border.position.y = 0.02;
	      world.scene.add(border);
	      world.arenaObjects.push(border);
	      world.arenaDecor = [];

      // Main cover placements - collide-able obstacles
      const placements = [
        // Center major occluder - Tank (permanent cover)
        { key: 'Tank', pos: [0, 0, -0.6], rot: Math.PI * 0.6, collide: true },

        // Safe spawn cover (permanent)
        { key: 'Barrier_Large', pos: [-11.2, 0, -4.2], rot: Math.PI / 2, collide: true },
        { key: 'Barrier_Large', pos: [-11.2, 0, 4.2], rot: Math.PI / 2, collide: true },
        { key: 'Barrier_Large', pos: [11.2, 0, -4.2], rot: -Math.PI / 2, collide: true },
        { key: 'Barrier_Large', pos: [11.2, 0, 4.2], rot: -Math.PI / 2, collide: true },

        // Permanent lane anchors
        { key: 'SackTrench', pos: [-7.4, 0, 0.8], rot: 0, collide: true },
        { key: 'SackTrench', pos: [7.4, 0, -0.8], rot: Math.PI, collide: true },
        { key: 'Container_Small', pos: [-10.2, 0, -7.2], rot: 0.1, collide: true },
        { key: 'Container_Small', pos: [10.2, 0, 7.2], rot: -Math.PI + 0.1, collide: true },
        { key: 'Structure_1', pos: [-10.3, 0, 7.1], rot: 0, collide: true },
        { key: 'Structure_1', pos: [10.3, 0, -7.1], rot: Math.PI, collide: true },

        // Mid-map destructible cover (opens up over the match)
        { key: 'Crate', pos: [-3.2, 0, 0], rot: 0.2, collide: true },
        { key: 'Crate', pos: [3.2, 0, 0], rot: -0.2, collide: true },
        { key: 'Crate', pos: [0, 0, 5.1], rot: 0.5, collide: true },
        { key: 'Crate', pos: [0, 0, -5.1], rot: -0.4, collide: true },
        { key: 'Pallet', pos: [-6.2, 0, -1.6], rot: 0.15, collide: true },
        { key: 'Pallet', pos: [6.2, 0, 1.6], rot: -0.15, collide: true },
        { key: 'Sofa', pos: [-8.3, 0, 5.9], rot: Math.PI / 4, collide: true },
        { key: 'Sofa', pos: [8.3, 0, -5.9], rot: -Math.PI / 4, collide: true },
        { key: 'CardboardBoxes_2', pos: [-2.2, 0, -6.6], rot: 0.2, collide: true },
        { key: 'CardboardBoxes_3', pos: [2.2, 0, 6.6], rot: -0.2, collide: true }
      ];

      // Decorative props - non-colliding clutter for visual density
      const decorativePlacements = [
        // Cardboard boxes clusters scattered around
        { key: 'CardboardBoxes_1', pos: [-11, 0, 5], rot: 0.3 },
        { key: 'CardboardBoxes_2', pos: [11, 0, -5], rot: -0.4 },
        { key: 'CardboardBoxes_3', pos: [-2, 0, -7], rot: 0.1 },
        { key: 'CardboardBoxes_4', pos: [2, 0, 7], rot: -0.2 },
        { key: 'CardboardBoxes_1', pos: [5, 0, -6], rot: 0.6 },
        { key: 'CardboardBoxes_2', pos: [-5, 0, 6], rot: -0.5 },
        // Tires scattered
        { key: 'Debris_Tires', pos: [4, 0, -3], rot: 0 },
        { key: 'Debris_Tires', pos: [-4, 0, -5], rot: Math.PI / 3 },
        { key: 'Debris_Tires', pos: [8, 0, 2], rot: 0.8 },
        // Traffic cones marking areas
        { key: 'TrafficCone', pos: [-2, 0, -2], rot: 0 },
        { key: 'TrafficCone', pos: [2, 0, 2], rot: 0 },
        { key: 'TrafficCone', pos: [-9, 0, 0], rot: 0.2 },
        { key: 'TrafficCone', pos: [9, 0, 0], rot: -0.1 },
        { key: 'TrafficCone', pos: [0, 0, -8], rot: 0.3 },
        { key: 'TrafficCone', pos: [0, 0, 8], rot: -0.2 },
        // Debris piles
        { key: 'Debris_Pile', pos: [-10, 0, 2], rot: 0.5 },
        { key: 'Debris_Pile', pos: [10, 0, -2], rot: -0.3 },
        { key: 'Debris_Pile', pos: [3, 0, -4], rot: 0.7 },
        // Paper debris scattered
        { key: 'Debris_Papers_1', pos: [-1, 0, -3], rot: 0.8 },
        { key: 'Debris_Papers_2', pos: [1, 0, 3], rot: -0.6 },
        { key: 'Debris_Papers_3', pos: [-6, 0, -2], rot: 0.4 },
        // Gas cans
        { key: 'GasCan', pos: [-7, 0, -4], rot: 0.2 },
        { key: 'GasCan', pos: [7, 0, 4], rot: -0.3 },
        // Wood planks
        { key: 'WoodPlanks', pos: [-3, 0, 4], rot: 0.6 },
        { key: 'WoodPlanks', pos: [3, 0, -4], rot: -0.5 },
        // Broken pallets
        { key: 'Pallet_Broken', pos: [9, 0, -4], rot: 0.3 },
        { key: 'Pallet_Broken', pos: [-9, 0, 4], rot: -0.4 },
        // Pipes near edges
        { key: 'Pipes', pos: [-12, 0, 0], rot: Math.PI / 2 },
        { key: 'Pipes', pos: [12, 0, 0], rot: -Math.PI / 2 },
        // Trash containers at edges
        { key: 'TrashContainer', pos: [-12, 0, -6], rot: 0.1 },
        { key: 'TrashContainer_Open', pos: [12, 0, 6], rot: -0.1 },
        // Street lights for atmosphere
        { key: 'StreetLight', pos: [-12, 0, 4], rot: 0 },
        { key: 'StreetLight', pos: [12, 0, -4], rot: Math.PI },
        // Signs
        { key: 'Sign', pos: [-11, 0, 7], rot: -0.2 },
        { key: 'Sign', pos: [11, 0, -7], rot: 0.3 }
      ];

      const fallbackSizes = {
        Tank: [4.5, 2.5, 3.0],
        Debris_BrokenCar: [3.5, 1.5, 2.0],
        Container_Small: [4.2, 2.0, 2.2],
        Barrier_Large: [3.6, 1.2, 1.2],
        Crate: [1.2, 1.2, 1.2],
        SackTrench: [2.4, 0.8, 1.2],
        Sofa: [2.0, 1.0, 1.0],
        Structure_1: [2.5, 2.0, 2.5],
        Pallet: [1.4, 0.2, 1.4],
        CardboardBoxes_1: [1.1, 0.8, 1.1],
        CardboardBoxes_2: [1.1, 0.8, 1.1],
        CardboardBoxes_3: [1.1, 0.8, 1.1],
        CardboardBoxes_4: [1.1, 0.8, 1.1]
      };

      // Place colliding cover
	      placements.forEach((item) => {
	        const path = manifest.environment[item.key];
	        const clone = cloneAsset(path);
	        const isFallback = !clone;
	        const activeVisual = isFallback ? 'placeholder' : 'gltf';
	        const visuals = { gltf: null, placeholder: null };
	        const fbSize = fallbackSizes[item.key] || [2, 1.5, 2];
	        const root = isFallback
	          ? new THREE.Mesh(
	            new THREE.BoxGeometry(...fbSize),
	            new THREE.MeshStandardMaterial({ color: COLORS.steel, roughness: 0.7, metalness: 0.1 })
	          )
	          : normalizeToHeight(clone.root, null);
	        if (isFallback) root.position.y = fbSize[1] / 2;
	        visuals[activeVisual] = isFallback ? markPlaceholder(root) : root;
	        root.position.set(item.pos[0], root.position.y, item.pos[2]);
	        root.rotation.y = item.rot;
	        root.traverse?.((child) => {
	          if (child.isMesh) {
	            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        world.scene.add(root);
        world.arenaObjects.push(root);

	        if (item.collide !== false) {
	          const box = computeMeshBounds(root);
	          const inset = 0.08;
		          const typeCfg = CONFIG.cover.types[item.key] || null;
		          const cover = {
	            key: item.key,
	            assetPath: path,
	            mesh: root,
	            visuals,
	            activeVisual,
	            spawnPos: root.position.clone(),
	            spawnRotY: root.rotation.y,
		            minX: box.min.x + inset,
		            maxX: box.max.x - inset,
		            minZ: box.min.z + inset,
	            maxZ: box.max.z - inset,
	            minY: box.min.y,
	            maxY: box.max.y,
	            blocksLoS: true,
	            active: true,
	            destructible: Boolean(typeCfg),
            hp: typeCfg ? typeCfg.hp : null,
            maxHp: typeCfg ? typeCfg.hp : null,
            kickable: Boolean(typeCfg),
            flashTimer: 0,
            originalMaterials: null,
            colliderOffsets: null,
            kickState: null
          };
          cacheCoverColliderOffsets(cover);
          world.cover.push(cover);
        }
      });

	      // Place decorative (non-colliding) props
	      decorativePlacements.forEach((item) => {
	        const path = manifest.environment[item.key];
	        if (!path) return; // Skip if asset doesn't exist
	        const clone = cloneAsset(path);
	        const activeVisual = clone ? 'gltf' : 'placeholder';
	        const visuals = { gltf: null, placeholder: null };
	        const root = clone
	          ? normalizeToHeight(clone.root, null)
	          : markPlaceholder(
	            new THREE.Mesh(
	              new THREE.BoxGeometry(0.9, 0.6, 0.9),
	              new THREE.MeshStandardMaterial({ color: COLORS.dustDark, roughness: 0.85, metalness: 0.05 })
	            )
	          );
	        visuals[activeVisual] = root;
	        root.position.set(item.pos[0], root.position.y, item.pos[2]);
	        root.rotation.y = item.rot;
	        root.traverse?.((child) => {
	          if (child.isMesh) {
	            child.castShadow = true;
	            child.receiveShadow = true;
	          }
	        });
	        world.scene.add(root);
	        world.arenaObjects.push(root);
	        world.arenaDecor.push({ kind: 'prop', key: item.key, assetPath: path, mesh: root, visuals, activeVisual });
	      });

	      const fencePath = manifest.environment.Fence_Long;
	      const fenceClone = cloneAsset(fencePath);
	      const fenceSegments = [
	        { pos: [0, 0, CONFIG.arena.bounds.minZ - 0.4], rot: 0, len: CONFIG.arena.width + 0.8 },
	        { pos: [0, 0, CONFIG.arena.bounds.maxZ + 0.4], rot: Math.PI, len: CONFIG.arena.width + 0.8 },
	        { pos: [CONFIG.arena.bounds.minX - 0.4, 0, 0], rot: Math.PI / 2, len: CONFIG.arena.depth + 0.8 },
	        { pos: [CONFIG.arena.bounds.maxX + 0.4, 0, 0], rot: -Math.PI / 2, len: CONFIG.arena.depth + 0.8 }
	      ];
	      const fenceModel = fenceClone ? normalizeToHeight(fenceClone.root, null) : null;
	      fenceSegments.forEach((seg) => {
	        const cloneFence = fenceModel ? fenceModel.clone(true) : null;
	        const activeVisual = cloneFence ? 'gltf' : 'placeholder';
	        const visuals = { gltf: null, placeholder: null };
	        const fence = cloneFence
	          ? cloneFence
	          : markPlaceholder(
	            new THREE.Mesh(
	              new THREE.BoxGeometry(seg.len, 1.1, 0.18),
	              new THREE.MeshStandardMaterial({ color: COLORS.steel, roughness: 0.8, metalness: 0.05 })
	            )
	          );
	        visuals[activeVisual] = fence;
	        if (cloneFence) {
	          fence.position.set(seg.pos[0], 0, seg.pos[2]);
	        } else {
	          fence.position.set(seg.pos[0], 0.55, seg.pos[2]);
	        }
	        fence.rotation.y = seg.rot;
	        fence.scale.setScalar(1.1);
	        world.scene.add(fence);
	        world.arenaObjects.push(fence);
	        world.arenaDecor.push({
	          kind: 'fence',
	          key: 'Fence_Long',
	          assetPath: fencePath,
	          mesh: fence,
	          visuals,
	          activeVisual,
	          placeholderLength: seg.len
	        });
	      });

	      world.arenaLayout = { decorativePlacements, fallbackSizes, fenceSegments };

	      spawnBarrels();

	      buildCoverNodes();
	    }


    export function cacheCoverColliderOffsets(cover) {
      if (!cover.mesh) return;
      const box = computeMeshBounds(cover.mesh);
      cover.colliderOffsets = {
        minX: cover.minX - cover.mesh.position.x,
        maxX: cover.maxX - cover.mesh.position.x,
        minZ: cover.minZ - cover.mesh.position.z,
        maxZ: cover.maxZ - cover.mesh.position.z,
        minY: box.min.y - cover.mesh.position.y,
        maxY: box.max.y - cover.mesh.position.y
      };
      cover.minY = box.min.y;
      cover.maxY = box.max.y;
    }


    export function syncCoverColliderFromMesh(cover) {
      if (!cover.mesh || !cover.colliderOffsets) return;
      cover.minX = cover.mesh.position.x + cover.colliderOffsets.minX;
      cover.maxX = cover.mesh.position.x + cover.colliderOffsets.maxX;
      cover.minZ = cover.mesh.position.z + cover.colliderOffsets.minZ;
      cover.maxZ = cover.mesh.position.z + cover.colliderOffsets.maxZ;
      if (typeof cover.colliderOffsets.minY === 'number') {
        cover.minY = cover.mesh.position.y + cover.colliderOffsets.minY;
      }
      if (typeof cover.colliderOffsets.maxY === 'number') {
        cover.maxY = cover.mesh.position.y + cover.colliderOffsets.maxY;
      }
    }


    export function spawnBarrels() {
      const manifest = assets.manifest.assets.toonshooter;
      const barrelPath = manifest.environment.ExplodingBarrel;
      const barrelClone = cloneAsset(barrelPath);
      const barrelPositions = [
        new THREE.Vector3(-8.2, 0, -6.5),
        new THREE.Vector3(8.2, 0, 6.5),
        new THREE.Vector3(0, 0, 7.0)
      ];

	      barrelPositions.forEach((pos) => {
	        const barrelRoot = barrelClone ? normalizeToHeight(barrelClone.root.clone(true), null) : null;
	        const fallback = new THREE.Mesh(
	          new THREE.CylinderGeometry(0.45, 0.45, 1.2, 12),
	          new THREE.MeshStandardMaterial({ color: COLORS.warning, roughness: 0.4, metalness: 0.2 })
	        );
	        const mesh = barrelRoot || fallback;
	        const activeVisual = barrelRoot ? 'gltf' : 'placeholder';
	        const visuals = { gltf: null, placeholder: null };
	        mesh.position.copy(pos);
	        if (!barrelRoot) mesh.position.y = 0.6;
	        if (!barrelRoot) markPlaceholder(mesh);
	        visuals[activeVisual] = mesh;
	        mesh.castShadow = true;
	        mesh.receiveShadow = true;
	        world.scene.add(mesh);
	        world.barrels.push({
	          assetPath: barrelPath,
	          mesh,
	          position: mesh.position,
	          visuals,
	          activeVisual,
	          spawnPos: pos.clone(),
	          velocity: new THREE.Vector3(),
	          hp: CONFIG.barrel.hp,
	          alive: true,
          radius: CONFIG.barrel.radius,
          isRolling: false,
          rollTimer: 0
        });
      });
    }


    export function buildCoverNodes() {
      world.nodes = [];
      const offset = 1.1;
      world.cover.forEach((box) => {
        if (box.active === false) return;
        const cx = (box.minX + box.maxX) / 2;
        const cz = (box.minZ + box.maxZ) / 2;
        const hx = (box.maxX - box.minX) / 2 + offset;
        const hz = (box.maxZ - box.minZ) / 2 + offset;
        addNode(cx + hx, cz);
        addNode(cx - hx, cz);
        addNode(cx, cz + hz);
        addNode(cx, cz - hz);
      });

      addNode(-8, 0);
      addNode(8, 0);
      addNode(0, -7);
      addNode(0, 7);

      function addNode(x, z) {
        if (x < CONFIG.arena.bounds.minX + 1 || x > CONFIG.arena.bounds.maxX - 1) return;
        if (z < CONFIG.arena.bounds.minZ + 1 || z > CONFIG.arena.bounds.maxZ - 1) return;
        world.nodes.push(new THREE.Vector3(x, 0, z));
      }
    }
