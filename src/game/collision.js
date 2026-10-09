import * as THREE from 'three';
import { CONFIG } from './config.js';
import { fx, world } from './state.js';

    export function resolveCircleAABB(pos, radius, box) {
      const clampedX = THREE.MathUtils.clamp(pos.x, box.minX, box.maxX);
      const clampedZ = THREE.MathUtils.clamp(pos.z, box.minZ, box.maxZ);
      const dx = pos.x - clampedX;
      const dz = pos.z - clampedZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq) || 0.0001;
        const push = radius - dist;
        pos.x += (dx / dist) * push;
        pos.z += (dz / dist) * push;
      }
    }


    export function resolveCircleCircle(pos, radius, center, otherRadius) {
      const dx = pos.x - center.x;
      const dz = pos.z - center.z;
      const distSq = dx * dx + dz * dz;
      const minDist = radius + otherRadius;
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.0001;
        const push = minDist - dist;
        pos.x += (dx / dist) * push;
        pos.z += (dz / dist) * push;
      }
    }


    export function findCoverHit(start, end) {
      let result = null;
      world.cover.forEach((cover) => {
        if (cover.active === false) return;
        const t = segmentAABB(start, end, cover);
        if (t !== null && (!result || t < result.t)) result = { cover, t };
      });
      return result;
    }


    export function findClosestPlayerHit(start, end, attacker) {
      let result = null;
      world.entities.forEach((entity) => {
        if (!entity || entity === attacker || entity.isDead || entity.eliminated) return;
        const t = segmentCircle(start, end, entity.position, CONFIG.player.hurtRadius);
        if (t !== null && (!result || t < result.t)) {
          result = { entity, t };
        }
      });
      return result;
    }


    export function findClosestMiss(start, end, attacker) {
      let best = null;
      let bestDist = Infinity;
      world.entities.forEach((entity) => {
        if (!entity || entity === attacker || entity.isDead || entity.eliminated) return;
        const dist = distancePointToSegmentXZ(entity.position, start, end);
        if (dist < bestDist) {
          bestDist = dist;
          best = { entity, dist };
        }
      });
      return best;
    }


    export function findCircleHit(start, end, center, radius) {
      return segmentCircle(start, end, center, radius);
    }


    export function findBarrelHit(start, end) {
      let result = null;
      world.barrels.forEach((barrel) => {
        if (!barrel.alive) return;
        const t = segmentCircle(start, end, barrel.position, barrel.radius);
        if (t !== null && (!result || t < result.t)) {
          result = { barrel, t };
        }
      });
      return result;
    }


    export function segmentAABB(p0, p1, box) {
      let tmin = 0;
      let tmax = 1;
      const dx = p1.x - p0.x;
      const dz = p1.z - p0.z;
      if (!updateSlab(p0.x, dx, box.minX, box.maxX)) return null;
      if (!updateSlab(p0.z, dz, box.minZ, box.maxZ)) return null;
      function updateSlab(p, d, min, max) {
        if (Math.abs(d) < 1e-6) {
          return p >= min && p <= max;
        }
        const inv = 1 / d;
        let t1 = (min - p) * inv;
        let t2 = (max - p) * inv;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        return tmin <= tmax;
      }
      if (tmin < 0 || tmin > 1) return null;
      return tmin;
    }


    export function segmentCircle(p0, p1, center, radius) {
      const dx = p1.x - p0.x;
      const dz = p1.z - p0.z;
      const fx = p0.x - center.x;
      const fz = p0.z - center.z;
      const a = dx * dx + dz * dz;
      const b = 2 * (fx * dx + fz * dz);
      const c = fx * fx + fz * fz - radius * radius;
      const discriminant = b * b - 4 * a * c;
      if (discriminant < 0) return null;
      const sqrt = Math.sqrt(discriminant);
      const t1 = (-b - sqrt) / (2 * a);
      const t2 = (-b + sqrt) / (2 * a);
      if (t1 >= 0 && t1 <= 1) return t1;
      if (t2 >= 0 && t2 <= 1) return t2;
      return null;
    }


    export function distancePointToSegmentXZ(point, start, end) {
      const px = point.x;
      const pz = point.z;
      const sx = start.x;
      const sz = start.z;
      const ex = end.x;
      const ez = end.z;
      const dx = ex - sx;
      const dz = ez - sz;
      const lenSq = dx * dx + dz * dz;
      if (lenSq === 0) return Math.hypot(px - sx, pz - sz);
      let t = ((px - sx) * dx + (pz - sz) * dz) / lenSq;
      t = THREE.MathUtils.clamp(t, 0, 1);
      const cx = sx + t * dx;
      const cz = sz + t * dz;
      return Math.hypot(px - cx, pz - cz);
    }


    export function hasLineOfSight(a, b) {
      for (const box of world.cover) {
        if (box.active === false) continue;
        if (segmentAABB(a, b, box) !== null) return false;
      }
      for (const barrel of world.barrels) {
        if (!barrel.alive) continue;
        if (segmentCircle(a, b, barrel.position, barrel.radius) !== null) return false;
      }
      return true;
    }
