import { state } from './state.js';

// Arena layouts. Arena bounds are x ±13, z ±9 (scaled 1.3x in deathmatch) and the
// spawn points are (±9, 0) and (0, ±7), so keep ~2 units clear around those.
// cover: colliding props (destructible if listed in CONFIG.cover.types)
// decor: non-colliding clutter · barrels: exploding barrels · hazards: mines / bear traps

const YARD_COVER = [
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

const YARD_DECOR = [
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

// Container lanes: two long boxes split the middle, cars guard the corners.
const DEPOT_COVER = [
  { key: 'Container_Small', pos: [0, 0, -3.2], rot: 0, collide: true },
  { key: 'Container_Small', pos: [0, 0, 3.2], rot: Math.PI, collide: true },
  { key: 'Debris_BrokenCar', pos: [-5.6, 0, -5.6], rot: 0.4, collide: true },
  { key: 'Debris_BrokenCar', pos: [5.6, 0, 5.6], rot: Math.PI + 0.4, collide: true },
  { key: 'Barrier_Large', pos: [-6, 0, 2.6], rot: 0, collide: true },
  { key: 'Barrier_Large', pos: [6, 0, -2.6], rot: 0, collide: true },
  { key: 'Barrier_Large', pos: [-11.6, 0, -2.8], rot: Math.PI / 2, collide: true },
  { key: 'Barrier_Large', pos: [11.6, 0, 2.8], rot: Math.PI / 2, collide: true },
  { key: 'Crate', pos: [-3.4, 0, 0], rot: 0.3, collide: true },
  { key: 'Crate', pos: [3.4, 0, 0], rot: -0.3, collide: true },
  { key: 'Crate', pos: [-9, 0, -3.8], rot: 0.1, collide: true },
  { key: 'Crate', pos: [9, 0, 3.8], rot: -0.1, collide: true },
  { key: 'Pallet', pos: [-3.6, 0, 6.8], rot: 0.2, collide: true },
  { key: 'Pallet', pos: [3.6, 0, -6.8], rot: -0.2, collide: true },
  { key: 'Sofa', pos: [-10.8, 0, 6.4], rot: Math.PI / 2, collide: true },
  { key: 'Sofa', pos: [10.8, 0, -6.4], rot: -Math.PI / 2, collide: true },
  { key: 'CardboardBoxes_1', pos: [6.6, 0, 7.4], rot: 0.3, collide: true },
  { key: 'CardboardBoxes_4', pos: [-6.6, 0, -7.4], rot: -0.3, collide: true }
];

const DEPOT_DECOR = [
  { key: 'TrafficCone', pos: [-1.8, 0, 0], rot: 0 },
  { key: 'TrafficCone', pos: [1.8, 0, 0], rot: 0.4 },
  { key: 'TrafficCone', pos: [-12, 0, 8], rot: 0 },
  { key: 'TrafficCone', pos: [12, 0, -8], rot: 0 },
  { key: 'Debris_Tires', pos: [-8, 0, 7.5], rot: 0.6 },
  { key: 'Debris_Tires', pos: [8, 0, -7.5], rot: -0.2 },
  { key: 'Pallet_Broken', pos: [-6.5, 0, 0.2], rot: 0.4 },
  { key: 'Pallet_Broken', pos: [6.5, 0, -0.2], rot: -0.4 },
  { key: 'Debris_Papers_1', pos: [-2, 0, -6], rot: 0.5 },
  { key: 'Debris_Papers_2', pos: [2, 0, 6], rot: -0.3 },
  { key: 'GasCan', pos: [-4.4, 0, -2.2], rot: 0.2 },
  { key: 'GasCan', pos: [4.4, 0, 2.2], rot: -0.6 },
  { key: 'TrashContainer', pos: [-12.2, 0, 3.2], rot: Math.PI / 2 },
  { key: 'TrashContainer_Open', pos: [12.2, 0, -3.2], rot: -Math.PI / 2 },
  { key: 'StreetLight', pos: [-12.2, 0, -7.4], rot: 0 },
  { key: 'StreetLight', pos: [12.2, 0, 7.4], rot: Math.PI },
  { key: 'Sign', pos: [0, 0, -8.4], rot: 0 },
  { key: 'Pipes', pos: [0, 0, 8.4], rot: 0 }
];

// Trench warfare: sandbag rows and a center wall, open flanks.
const BARRICADES_COVER = [
  { key: 'Barrier_Large', pos: [0, 0, 0], rot: Math.PI / 2, collide: true },
  { key: 'SackTrench', pos: [-4, 0, -4], rot: 0, collide: true },
  { key: 'SackTrench', pos: [4, 0, 4], rot: 0, collide: true },
  { key: 'SackTrench', pos: [-4, 0, 4], rot: 0, collide: true },
  { key: 'SackTrench', pos: [4, 0, -4], rot: 0, collide: true },
  { key: 'Crate', pos: [-7, 0, -2], rot: 0.2, collide: true },
  { key: 'Crate', pos: [7, 0, 2], rot: -0.2, collide: true },
  { key: 'Crate', pos: [-2.6, 0, -6.2], rot: 0.4, collide: true },
  { key: 'Crate', pos: [2.6, 0, 6.2], rot: -0.4, collide: true },
  { key: 'Sofa', pos: [-7, 0, 5], rot: 0.5, collide: true },
  { key: 'Sofa', pos: [7, 0, -5], rot: -0.5, collide: true },
  { key: 'Debris_BrokenCar', pos: [-10.6, 0, -6], rot: 0.2, collide: true },
  { key: 'Debris_BrokenCar', pos: [10.6, 0, 6], rot: Math.PI + 0.2, collide: true },
  { key: 'Pallet', pos: [-10.6, 0, 3.6], rot: 0.3, collide: true },
  { key: 'Pallet', pos: [10.6, 0, -3.6], rot: -0.3, collide: true },
  { key: 'CardboardBoxes_2', pos: [-5.6, 0, 0.6], rot: 0.2, collide: true },
  { key: 'CardboardBoxes_3', pos: [5.6, 0, -0.6], rot: -0.2, collide: true }
];

const BARRICADES_DECOR = [
  { key: 'Debris_Pile', pos: [-1.8, 0, -2.8], rot: 0.4 },
  { key: 'Debris_Pile', pos: [1.8, 0, 2.8], rot: -0.4 },
  { key: 'WoodPlanks', pos: [-8.6, 0, -0.2], rot: 0.5 },
  { key: 'WoodPlanks', pos: [8.6, 0, 0.2], rot: -0.5 },
  { key: 'Debris_Tires', pos: [-12, 0, 0], rot: 0 },
  { key: 'Debris_Tires', pos: [12, 0, 0], rot: 0.7 },
  { key: 'TrafficCone', pos: [-4, 0, -2.4], rot: 0 },
  { key: 'TrafficCone', pos: [4, 0, 2.4], rot: 0 },
  { key: 'Debris_Papers_3', pos: [0, 0, -4.6], rot: 0.2 },
  { key: 'Debris_Papers_1', pos: [0, 0, 4.6], rot: -0.2 },
  { key: 'Sign', pos: [-12, 0, -8], rot: 0.4 },
  { key: 'Sign', pos: [12, 0, 8], rot: -0.4 },
  { key: 'StreetLight', pos: [-12.2, 0, 7.6], rot: 0 },
  { key: 'StreetLight', pos: [12.2, 0, -7.6], rot: Math.PI }
];

export const MAPS = {
  yard: {
    name: 'Junkyard',
    cover: YARD_COVER,
    decor: YARD_DECOR,
    // Third barrel used to sit on the (0, 7) deathmatch spawn; moved beside it.
    barrels: [[-8.2, 0, -6.5], [8.2, 0, 6.5], [-3.6, 0, 7.6]],
    hazards: [
      { type: 'mine', pos: [-4.6, 0, 3.0] },
      { type: 'mine', pos: [4.6, 0, -3.0] },
      { type: 'bearTrap', pos: [-5.8, 0, -4.8] },
      { type: 'bearTrap', pos: [5.8, 0, 4.8] }
    ]
  },
  depot: {
    name: 'Depot',
    cover: DEPOT_COVER,
    decor: DEPOT_DECOR,
    barrels: [[-4.6, 0, 4.6], [4.6, 0, -4.6], [0, 0, 0]],
    hazards: [
      { type: 'mine', pos: [-3.0, 0, 5.4] },
      { type: 'mine', pos: [3.0, 0, -5.4] },
      { type: 'bearTrap', pos: [-8.0, 0, 4.2] },
      { type: 'bearTrap', pos: [8.0, 0, -4.2] }
    ]
  },
  barricades: {
    name: 'Barricades',
    cover: BARRICADES_COVER,
    decor: BARRICADES_DECOR,
    barrels: [[-7, 0, 7.2], [7, 0, -7.2], [0, 0, 3.4]],
    hazards: [
      { type: 'mine', pos: [0, 0, -3.6] },
      { type: 'mine', pos: [-5.4, 0, 7.4] },
      { type: 'bearTrap', pos: [-7.5, 0, -5.6] },
      { type: 'bearTrap', pos: [7.5, 0, 5.6] }
    ]
  }
};

export function getMap() {
  return MAPS[state.mapId] || MAPS.yard;
}
