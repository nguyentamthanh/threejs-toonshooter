import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONFIG, SPAWN_POINTS, WEAPON_IDS } from '../src/game/config.js';
import { MAPS } from '../src/game/maps.js';

// Data checks: every weapon/map entry must point at assets that actually exist.
const manifest = JSON.parse(fs.readFileSync(new URL('../public/assets.json', import.meta.url), 'utf8')).assets.toonshooter;
const characterNodes = ['Character_Soldier', 'Character_Enemy', 'Character_Hazmat'].map((name) => {
  const gltf = JSON.parse(fs.readFileSync(new URL(`../public/${manifest.characters[name]}`, import.meta.url), 'utf8'));
  return { name, nodes: new Set(gltf.nodes.map((node) => node.name)) };
});

describe('weapons', () => {
  it.each(WEAPON_IDS)('%s has a pickup model and a gun node on every character', (weaponId) => {
    const weapon = CONFIG.weapons[weaponId];
    expect(manifest.guns[weapon.model]).toBeTruthy();
    characterNodes.forEach(({ nodes }) => expect(nodes.has(weapon.node)).toBe(true));
    expect(weapon.magSize).toBeGreaterThan(0);
    expect(weapon.fireRate).toBeGreaterThan(0);
    expect(weapon.range).toBeGreaterThan(0);
  });

  it('keeps number-key slots within 1-9', () => {
    expect(WEAPON_IDS.length).toBeLessThanOrEqual(9);
  });
});

describe('maps', () => {
  it.each(Object.keys(MAPS))('%s only uses props from the manifest', (mapId) => {
    const map = MAPS[mapId];
    [...map.cover, ...map.decor].forEach((item) => {
      expect(manifest.environment[item.key], item.key).toBeTruthy();
    });
  });

  it.each(Object.keys(MAPS))('%s keeps spawn points clear of hazards and barrels', (mapId) => {
    const map = MAPS[mapId];
    const points = [...map.hazards.map((h) => h.pos), ...map.barrels];
    SPAWN_POINTS.forEach((spawn) => {
      points.forEach(([x, , z]) => {
        expect(Math.hypot(spawn.x - x, spawn.z - z)).toBeGreaterThan(1.8);
      });
    });
  });

  it.each(Object.keys(MAPS))('%s places everything inside the duel arena', (mapId) => {
    const { bounds } = CONFIG.arena;
    const map = MAPS[mapId];
    [...map.cover.map((c) => c.pos), ...map.hazards.map((h) => h.pos), ...map.barrels].forEach(([x, , z]) => {
      expect(x).toBeGreaterThanOrEqual(bounds.minX);
      expect(x).toBeLessThanOrEqual(bounds.maxX);
      expect(z).toBeGreaterThanOrEqual(bounds.minZ);
      expect(z).toBeLessThanOrEqual(bounds.maxZ);
    });
  });
});
