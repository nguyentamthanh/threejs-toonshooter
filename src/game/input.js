import * as THREE from 'three';
import { tryDash, tryKick, tryThrowGrenade } from './actions.js';
import { startReload } from './combat.js';
import { CONFIG, MODEL_YAW_OFFSET, WEAPON_IDS } from './config.js';
import { canvas } from './dom.js';
import { requestWeaponSwitch } from './entities.js';
import { startMatch, togglePause } from './match.js';
import { groundPlane, input, raycaster, settings, state, world } from './state.js';
import { getPlayer, rotateToward } from './util.js';
import { setVisualMode } from './visuals.js';

	    export function bindInput() {
	      window.addEventListener('keydown', (event) => {
	        input.keys[event.code] = true;
	        if (event.code === 'Tab') {
	          event.preventDefault();
	          state.showLeaderboard = true;
	        }
	        if (event.code === 'KeyV') {
	          setVisualMode(!settings.usePlaceholders);
	        }
	        if (event.code === 'Escape' || event.code === 'KeyP') {
	          togglePause();
	        }
	        if (event.code === 'Enter') {
	          if (state.mode === 'menu') startMatch();
          if (state.mode === 'matchOver') startMatch();
        }
        if (event.code === 'Space') {
          if (state.mode === 'playing') {
            const player = getPlayer();
            tryDash(player);
          }
        }
        if (event.code === 'KeyR') {
          const player = getPlayer();
          if (state.mode === 'playing') {
            startReload(player);
          }
        }
	        if (state.mode === 'playing') {
	          const player = getPlayer();
	          const slot = /^Digit([1-9])$/.exec(event.code);
	          const slotWeapon = slot ? WEAPON_IDS[Number(slot[1]) - 1] : null;
	          if (slotWeapon) requestWeaponSwitch(player, slotWeapon);
	          if (event.code === 'KeyE' || event.code === 'KeyF') tryKick(player);
	          if (event.code === 'KeyG' && !event.repeat) tryThrowGrenade(player);
	        }
	      });

      window.addEventListener('keyup', (event) => {
        input.keys[event.code] = false;
        if (event.code === 'Tab') {
          state.showLeaderboard = false;
        }
      });

      // Touch input goes through the virtual sticks (touch.js), not the mouse path.
      window.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'touch') return;
        input.mouse.down = true;
        input.mouse.justPressed = true;
        updatePointer(event);
      });

      window.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'touch') return;
        input.mouse.down = false;
      });

      window.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;
        updatePointer(event);
      });
    }


    export function updatePointer(event) {
      const rect = canvas.getBoundingClientRect();
      input.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      input.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }


    export function updateAim(entity, targetPos, dt) {
      const aimPoint = targetPos || getAimPoint();
      if (!aimPoint) return;
      const dir = aimPoint.clone().sub(entity.position);
      dir.y = 0;
      if (dir.lengthSq() < 0.001) return;
      dir.normalize();
      const targetYaw = Math.atan2(dir.x, dir.z);
      const maxDelta = CONFIG.movement.turnSpeed * dt;
      entity.yaw = rotateToward(entity.yaw, targetYaw, maxDelta);
      entity.group.rotation.y = entity.yaw + MODEL_YAW_OFFSET;

      if (entity.team === 'p1' && world.reticle) {
        world.reticle.position.set(aimPoint.x, 0.02, aimPoint.z);
      }
    }


    export function getAimPoint() {
      if (input.touch.enabled) return getTouchAimPoint();
      raycaster.setFromCamera({ x: input.mouse.x, y: input.mouse.y }, world.camera);
      const point = new THREE.Vector3();
      const hit = raycaster.ray.intersectPlane(groundPlane, point);
      if (!hit) return null;
      point.x = THREE.MathUtils.clamp(point.x, CONFIG.arena.bounds.minX, CONFIG.arena.bounds.maxX);
      point.z = THREE.MathUtils.clamp(point.z, CONFIG.arena.bounds.minZ, CONFIG.arena.bounds.maxZ);
      return point;
    }


    // Aim point for touch play: along the aim stick, or straight ahead of the
    // player's current facing when the stick is released.
    function getTouchAimPoint() {
      const player = getPlayer();
      if (!player) return null;
      const dir = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
      const { aim } = input.touch;
      if (aim.active && Math.hypot(aim.x, aim.y) > 0.1) {
        const forward = new THREE.Vector3();
        world.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        dir.copy(forward).multiplyScalar(aim.y).addScaledVector(right, aim.x).normalize();
      }
      const point = player.position.clone().addScaledVector(dir, 8);
      point.y = 0;
      point.x = THREE.MathUtils.clamp(point.x, CONFIG.arena.bounds.minX, CONFIG.arena.bounds.maxX);
      point.z = THREE.MathUtils.clamp(point.z, CONFIG.arena.bounds.minZ, CONFIG.arena.bounds.maxZ);
      return point;
    }


    export function getAimDirection(entity, targetPos) {
      const aimPoint = targetPos || getAimPoint();
      const dir = aimPoint ? aimPoint.clone().sub(entity.position) : new THREE.Vector3(0, 0, 1);
      dir.y = 0;
      if (dir.lengthSq() < 0.001) dir.z = 1;
      return dir.normalize();
    }


    export function getMoveInput() {
      const forward = new THREE.Vector3();
      world.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      const dir = new THREE.Vector3();
      if (input.keys['KeyW']) dir.add(forward);
      if (input.keys['KeyS']) dir.sub(forward);
      if (input.keys['KeyA']) dir.sub(right);
      if (input.keys['KeyD']) dir.add(right);
      const { move } = input.touch;
      if (dir.lengthSq() === 0 && Math.hypot(move.x, move.y) > 0.12) {
        dir.addScaledVector(forward, move.y).addScaledVector(right, move.x);
      }
      if (dir.lengthSq() > 0) dir.normalize();
      return dir;
    }
