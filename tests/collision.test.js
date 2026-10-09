import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  distancePointToSegmentXZ,
  hasLineOfSight,
  resolveCircleAABB,
  segmentAABB,
  segmentCircle
} from '../src/game/collision.js';
import { world } from '../src/game/state.js';

const v = (x, z) => new THREE.Vector3(x, 0, z);
const box = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };

describe('segmentAABB', () => {
  it('returns the entry fraction when the segment crosses the box', () => {
    expect(segmentAABB(v(-5, 0), v(5, 0), box)).toBeCloseTo(0.4);
  });

  it('returns null when the segment misses or stops short', () => {
    expect(segmentAABB(v(-5, 3), v(5, 3), box)).toBeNull();
    expect(segmentAABB(v(-5, 0), v(-2, 0), box)).toBeNull();
  });
});

describe('segmentCircle', () => {
  it('finds the first intersection along the segment', () => {
    expect(segmentCircle(v(-4, 0), v(4, 0), v(0, 0), 1)).toBeCloseTo(3 / 8);
  });

  it('returns null for a clear miss', () => {
    expect(segmentCircle(v(-4, 2), v(4, 2), v(0, 0), 1)).toBeNull();
  });
});

describe('distancePointToSegmentXZ', () => {
  it('measures perpendicular distance inside the segment and endpoint distance outside it', () => {
    expect(distancePointToSegmentXZ(v(0, 3), v(-2, 0), v(2, 0))).toBeCloseTo(3);
    expect(distancePointToSegmentXZ(v(5, 0), v(-2, 0), v(2, 0))).toBeCloseTo(3);
  });
});

describe('resolveCircleAABB', () => {
  it('pushes an overlapping circle out to the box edge', () => {
    const pos = v(1.2, 0);
    resolveCircleAABB(pos, 0.5, box);
    expect(pos.x).toBeCloseTo(1.5);
    expect(pos.z).toBeCloseTo(0);
  });

  it('leaves a non-overlapping circle alone', () => {
    const pos = v(3, 0);
    resolveCircleAABB(pos, 0.5, box);
    expect(pos.x).toBe(3);
  });
});

describe('hasLineOfSight', () => {
  afterEach(() => {
    world.cover = [];
    world.barrels = [];
  });

  it('is blocked by active cover and clear once the cover is destroyed', () => {
    const cover = { ...box, active: true };
    world.cover = [cover];
    expect(hasLineOfSight(v(-5, 0), v(5, 0))).toBe(false);
    cover.active = false;
    expect(hasLineOfSight(v(-5, 0), v(5, 0))).toBe(true);
  });

  it('is blocked by live barrels', () => {
    world.barrels = [{ alive: true, position: v(0, 0), radius: 0.6 }];
    expect(hasLineOfSight(v(-5, 0), v(5, 0))).toBe(false);
  });
});
