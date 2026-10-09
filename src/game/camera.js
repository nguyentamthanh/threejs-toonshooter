import * as THREE from 'three';
import { CONFIG } from './config.js';
import { lowHpVignette } from './dom.js';
import { fx, state, world } from './state.js';
import { getAliveEntities, getEntityByTeam, getPlayer, moveToward } from './util.js';

    export function updateCameraFx(dt) {
      if (state.mode === 'killCam') return;
      if (!world.cameraState) {
        world.cameraState = {
          pos: CONFIG.camera.position.clone(),
          lookAt: CONFIG.camera.lookAt.clone(),
          fov: CONFIG.camera.fov
        };
      }

      const player = getPlayer();
      const alive = getAliveEntities();
      const center = alive.length
        ? alive.reduce((acc, entity) => acc.add(entity.position), new THREE.Vector3()).multiplyScalar(1 / alive.length)
        : CONFIG.camera.lookAt.clone();
      center.y = 0;

      let targetPos = CONFIG.camera.position.clone();
      let targetLookAt = center.clone();
      let targetFov = CONFIG.camera.fov;

      // Follow the fight slightly so the action stays centered.
      targetPos.x += center.x * 0.12;
      targetPos.z += center.z * 0.08;

      const bothFiring = alive.filter(entity => entity.firedRecentlyTimer > 0).length >= 2;
      if (bothFiring) {
        targetFov += 5;
        targetPos.y += 2;
      }

      if (player && player.hp <= 35) {
        targetFov -= 2;
        const t = THREE.MathUtils.clamp((35 - player.hp) / 35, 0, 1);
        lowHpVignette.style.opacity = String(0.75 * t);
      } else {
        lowHpVignette.style.opacity = '0';
      }

      if (fx.dramaticTimer > 0 && fx.dramaticTeam) {
        const dodger = getEntityByTeam(fx.dramaticTeam);
        if (dodger) {
          targetFov = CONFIG.camera.fov / CONFIG.nearMissDrama.cameraZoom;
          targetLookAt = dodger.position.clone();
          targetLookAt.y = 0.7;
          targetPos.x += (dodger.position.x - center.x) * 0.8;
          targetPos.z += (dodger.position.z - center.z) * 0.6;
        }
      }

      const lerpK = 1 - Math.exp(-dt * 3);
      world.cameraState.pos.lerp(targetPos, lerpK);
      world.cameraState.lookAt.lerp(targetLookAt, lerpK);
      world.cameraState.fov = THREE.MathUtils.lerp(world.cameraState.fov, targetFov, lerpK);

      const shake = fx.shakeTime > 0 ? fx.shakeIntensity : 0;
      if (fx.shakeTime > 0) fx.shakeTime -= dt;
      const shakeOffset = new THREE.Vector3(
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake
      );

      fx.fovPulse = moveToward(fx.fovPulse, 0, dt * 5);
      world.camera.fov = world.cameraState.fov + fx.fovPulse * 2;
      world.camera.updateProjectionMatrix();
      world.camera.position.copy(world.cameraState.pos).add(shakeOffset);
      world.camera.lookAt(world.cameraState.lookAt);
    }
