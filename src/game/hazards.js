import * as THREE from 'three';
import { cloneAsset, normalizeToHeight } from './assets.js';
import { applyDamage, applyStun, explodeAt } from './combat.js';
import { CONFIG } from './config.js';
import { emit } from './events.js';
import { spawnPopup } from './hud.js';
import { getMap } from './maps.js';
import { assets, world } from './state.js';
import { getFallbackOpponentTeam } from './util.js';

// Floor hazards placed per map (maps.js): landmines blow up once per round,
// bear traps snap shut, root the victim, then re-open after a while.

const MODEL = { mine: 'Landmine', bearTrapOpen: 'BearTrap_Open', bearTrapClosed: 'BearTrap_Closed' };
const FALLBACK_COLOR = { mine: 0x5a6a3a, bearTrapOpen: 0x8a8f96, bearTrapClosed: 0x5d6168 };

function createHazardMesh(kind) {
  const path = assets.manifest.assets.toonshooter.environment[MODEL[kind]];
  const clone = path ? cloneAsset(path) : null;
  if (clone) return normalizeToHeight(clone.root, null);
  const height = kind === 'bearTrapClosed' ? 0.22 : 0.12;
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.38, height, 14),
    new THREE.MeshStandardMaterial({ color: FALLBACK_COLOR[kind], roughness: 0.6, metalness: 0.3 })
  );
  mesh.position.y = height / 2;
  return mesh;
}

function setHazardMesh(hazard, kind) {
  const rotationY = hazard.mesh ? hazard.mesh.rotation.y : Math.random() * Math.PI * 2;
  if (hazard.mesh) world.scene.remove(hazard.mesh);
  const mesh = createHazardMesh(kind);
  mesh.position.set(hazard.position.x, mesh.position.y, hazard.position.z);
  mesh.rotation.y = rotationY;
  world.scene.add(mesh);
  hazard.mesh = mesh;
}

export function clearHazards() {
  (world.hazards || []).forEach((hazard) => {
    if (hazard.mesh) world.scene.remove(hazard.mesh);
  });
  world.hazards = [];
}

// Called when the arena is built and at the start of every round.
export function spawnHazards() {
  clearHazards();
  getMap().hazards?.forEach(({ type, pos }) => {
    const hazard = {
      type,
      position: new THREE.Vector3(pos[0], 0, pos[2]),
      mesh: null,
      armed: true,
      rearmTimer: 0
    };
    setHazardMesh(hazard, type === 'mine' ? 'mine' : 'bearTrapOpen');
    world.hazards.push(hazard);
  });
}

function findVictim(hazard, radius) {
  return world.entities.find((entity) => {
    if (!entity || entity.isDead || entity.eliminated) return false;
    const dx = entity.position.x - hazard.position.x;
    const dz = entity.position.z - hazard.position.z;
    return Math.hypot(dx, dz) <= radius;
  });
}

function triggerMine(hazard) {
  hazard.armed = false;
  if (hazard.mesh) world.scene.remove(hazard.mesh);
  hazard.mesh = null;
  const pos = hazard.position.clone();
  pos.y = 0.2;
  explodeAt(pos, null, CONFIG.hazards.mine, 'mine');
}

function triggerBearTrap(hazard, victim) {
  const cfg = CONFIG.hazards.bearTrap;
  hazard.armed = false;
  hazard.rearmTimer = cfg.rearm;
  setHazardMesh(hazard, 'bearTrapClosed');
  victim.velocity.set(0, 0, 0);
  victim.position.x = hazard.position.x;
  victim.position.z = hazard.position.z;
  applyStun(victim, cfg.stun);
  const popupPos = victim.position.clone();
  popupPos.y = 2.2;
  spawnPopup('TRAPPED!', popupPos, 'close', 0.8);
  emit('trap', { entity: victim });
  applyDamage(victim, cfg.damage, getFallbackOpponentTeam(victim.team), null);
}

export function updateHazards(dt) {
  (world.hazards || []).forEach((hazard) => {
    if (hazard.type === 'bearTrap' && !hazard.armed) {
      hazard.rearmTimer -= dt;
      if (hazard.rearmTimer <= 0) {
        hazard.armed = true;
        setHazardMesh(hazard, 'bearTrapOpen');
      }
      return;
    }
    if (!hazard.armed) return;
    if (hazard.type === 'mine') {
      if (findVictim(hazard, CONFIG.hazards.mine.triggerRadius)) triggerMine(hazard);
    } else {
      const victim = findVictim(hazard, CONFIG.hazards.bearTrap.triggerRadius);
      if (victim) triggerBearTrap(hazard, victim);
    }
  });
}
