import * as THREE from 'three';
import { COLORS } from './config.js';
import { canvas } from './dom.js';
import { fx, world } from './state.js';
import { getTeamColor } from './util.js';

// Geometry/texture shared by every effect instance (sized via mesh scale),
// so spawning an effect no longer allocates and later disposes GPU buffers.
const SHARED = {
  sphere: new THREE.SphereGeometry(1, 6, 6),
  box: new THREE.BoxGeometry(1, 1, 1),
  tracer: new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)]),
  spriteMap: null
};

function getSpriteMap() {
  if (!SHARED.spriteMap) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(16, 16, 10, 0, Math.PI * 2);
    ctx.fill();
    SHARED.spriteMap = new THREE.CanvasTexture(canvas);
  }
  return SHARED.spriteMap;
}

// Remove finished entries in place instead of allocating a new array each frame.
function compact(list, update) {
  let write = 0;
  for (let read = 0; read < list.length; read += 1) {
    const item = list[read];
    if (update(item)) {
      list[write] = item;
      write += 1;
    }
  }
  list.length = write;
}

    export function spawnCoverDebris(cover, sourceTeam) {
      const color = getTeamColor(sourceTeam);
      const center = cover.mesh ? cover.mesh.position.clone() : new THREE.Vector3(
        (cover.minX + cover.maxX) / 2,
        0,
        (cover.minZ + cover.maxZ) / 2
      );
      const pieces = 8;
      for (let i = 0; i < pieces; i++) {
        const size = 0.12 + Math.random() * 0.16;
        const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
        const piece = new THREE.Mesh(SHARED.box, material);
        piece.scale.setScalar(size);
        piece.position.copy(center);
        piece.position.y = 0.6 + Math.random() * 0.8;
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 4;
        piece.userData = {
          velocity: new THREE.Vector3(Math.cos(angle) * speed, 4 + Math.random() * 4, Math.sin(angle) * speed),
          life: 1.0,
          maxLife: 1.0
        };
        world.scene.add(piece);
        world.fxParticles.push(piece);
      }
    }


    export function spawnHitEffect(position, team, isDeath = false) {
      const color = getTeamColor(team);
      const particleCount = isDeath ? 12 : 5;
      const speed = isDeath ? 6 : 3;

      for (let i = 0; i < particleCount; i++) {
        // Create small blood/impact particle
        const size = 0.08 + Math.random() * 0.12;
        const material = new THREE.MeshBasicMaterial({
          color: isDeath ? 0xcc2222 : color,
          transparent: true,
          opacity: 0.9
        });
        const particle = new THREE.Mesh(SHARED.sphere, material);
        particle.scale.setScalar(size);

        // Start at hit position
        particle.position.copy(position);
        particle.position.y = 0.8 + Math.random() * 0.6;

        // Random velocity outward
        const angle = Math.random() * Math.PI * 2;
        const vSpeed = speed * (0.5 + Math.random() * 0.5);
        particle.userData = {
          velocity: new THREE.Vector3(
            Math.cos(angle) * vSpeed,
            2 + Math.random() * 3,
            Math.sin(angle) * vSpeed
          ),
          life: 0.4 + Math.random() * 0.3,
          maxLife: 0.4 + Math.random() * 0.3
        };

        world.scene.add(particle);
        world.fxParticles.push(particle);
      }
    }


    export function spawnExplosionSparks(position, count = 16, color = 0xffc44d) {
      for (let i = 0; i < count; i++) {
        const size = 0.06 + Math.random() * 0.09;
        const material = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.95
        });
        const particle = new THREE.Mesh(SHARED.sphere, material);
        particle.scale.setScalar(size);

        particle.position.copy(position);
        particle.position.y = 0.25 + Math.random() * 0.6;

        const angle = Math.random() * Math.PI * 2;
        const horiz = 7 + Math.random() * 7;
        const up = 7 + Math.random() * 10;
        particle.userData = {
          velocity: new THREE.Vector3(Math.cos(angle) * horiz, up, Math.sin(angle) * horiz),
          life: 0.28 + Math.random() * 0.18,
          maxLife: 0.28 + Math.random() * 0.18
        };

        world.scene.add(particle);
        world.fxParticles.push(particle);
      }
    }


    export function flashCharacter(entity, duration) {
      if (!entity.root) return;
      entity.flashTimer = duration;
      // Store original materials if not already stored
      if (!entity.originalMaterials) {
        entity.originalMaterials = [];
        entity.root.traverse((child) => {
          if (child.isMesh && child.material) {
            entity.originalMaterials.push({ mesh: child, material: child.material });
          }
        });
      }
      // Apply red flash material
      const flashMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
      entity.root.traverse((child) => {
        if (child.isMesh) {
          child.material = flashMat;
        }
      });
    }


    export function updateCharacterFlash(entity, dt) {
      if (!entity.flashTimer || entity.flashTimer <= 0) return;
      entity.flashTimer -= dt;
      if (entity.flashTimer <= 0 && entity.originalMaterials) {
        // Restore original materials
        entity.originalMaterials.forEach(({ mesh, material }) => {
          mesh.material = material;
        });
      }
    }


    export function playDeathAnimation(entity) {
      const mixerEntry = entity.mixers;
      if (!mixerEntry) return;
      // Stop all other animations and play death
      Object.values(mixerEntry.actions).forEach(action => {
        if (action && action !== mixerEntry.actions.death) {
          action.fadeOut(0.1);
        }
      });
      if (mixerEntry.actions.death) {
        mixerEntry.actions.death.reset();
        mixerEntry.actions.death.fadeIn(0.1);
        mixerEntry.actions.death.play();
        mixerEntry.current = 'death';
      }
    }


    export function setTimeScale(scale, duration) {
      fx.timeScale = scale;
      fx.timeScaleTimer = duration;
    }


    export function triggerRecoil() {
      fx.fovPulse = 0.6;
    }


    export function triggerShootAnimation(entity) {
      const mixerEntry = entity.mixers;
      if (!mixerEntry || !mixerEntry.actions.shoot) return;
      const action = mixerEntry.actions.shoot;
      action.reset();
      action.play();
    }


    export function triggerMuzzle(attacker, dir, weapon = null) {
      if (!attacker.muzzle) return;
      // Position muzzle flash at the gun tip in WORLD space
      // Gun is held to the right side, so offset sideways + forward in facing direction
      const forward = dir.clone().normalize();
      const right = new THREE.Vector3(-forward.z, 0, forward.x); // perpendicular
      // Muzzle is ~0.9 units forward + 0.25 units to right side (gun hand)
      const muzzlePos = attacker.position.clone();
      muzzlePos.y = 1.05;
      muzzlePos.addScaledVector(forward, 0.9);
      muzzlePos.addScaledVector(right, 0.25);
      attacker.muzzle.position.copy(muzzlePos);
      const size = weapon?.muzzleSize ?? 0.3;
      attacker.muzzle.scale.set(size, size, size);
      attacker.muzzle.visible = true;
      attacker.muzzle.life = weapon?.pellets ? 0.08 : 0.06;
    }


    export function spawnTracer(start, end, color = COLORS.tracer, life = 0.05, options = null) {
      const opacity = options?.opacity ?? 1;
      const additive = options?.additive ?? false;
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: opacity < 1 || additive,
        opacity,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false
      });
      // Shared unit line along +Z, positioned/rotated/scaled to span start -> end.
      const line = new THREE.Line(SHARED.tracer, material);
      line.position.copy(start);
      line.lookAt(end);
      line.scale.z = start.distanceTo(end);
      line.userData.life = life;
      line.renderOrder = additive ? 10 : 0;
      world.scene.add(line);
      world.fxLines.push(line);
    }


    export function updateTracers(dt) {
      compact(world.fxLines, (line) => {
        line.userData.life -= dt;
        if (line.userData.life <= 0) {
          world.scene.remove(line);
          line.material.dispose();
          return false;
        }
        return true;
      });
    }


    export function createSprite(color, size) {
      const material = new THREE.SpriteMaterial({ color, map: getSpriteMap(), transparent: true, opacity: 0.9 });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(size, size, size);
      return sprite;
    }


    export function spawnExplosion(position) {
      const smoke = createSprite(0x666666, 2.4);
      smoke.position.copy(position.clone().add(new THREE.Vector3(0, 1.2, 0)));
      smoke.userData.life = 0.4;
      world.scene.add(smoke);
      world.fxSprites.push(smoke);
    }


    export function updateSprites(dt) {
      compact(world.fxSprites, (sprite) => {
        sprite.userData.life -= dt;
        sprite.material.opacity = Math.max(0, sprite.userData.life / 0.4);
        sprite.scale.multiplyScalar(1 + dt * 1.5);
        if (sprite.userData.life <= 0) {
          world.scene.remove(sprite);
          sprite.material.dispose();
          return false;
        }
        return true;
      });
    }


    export function updateParticles(dt) {
      const gravity = -15;
      compact(world.fxParticles, (particle) => {
        particle.userData.life -= dt;
        // Apply gravity
        particle.userData.velocity.y += gravity * dt;
        // Move particle
        particle.position.addScaledVector(particle.userData.velocity, dt);
        // Bounce off ground
        if (particle.position.y < 0.05) {
          particle.position.y = 0.05;
          particle.userData.velocity.y *= -0.3;
          particle.userData.velocity.x *= 0.7;
          particle.userData.velocity.z *= 0.7;
        }
        // Fade out
        const lifeRatio = particle.userData.life / particle.userData.maxLife;
        particle.material.opacity = lifeRatio * 0.9;

        if (particle.userData.life <= 0) {
          world.scene.remove(particle);
          particle.material.dispose();
          return false;
        }
        return true;
      });
    }
