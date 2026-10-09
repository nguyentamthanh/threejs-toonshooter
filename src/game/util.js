import * as THREE from 'three';
import { COLORS } from './config.js';
import { fx, state, world } from './state.js';

    export function getSimTimeScale() {
      if (state.mode === 'paused') return 0;
      if (state.mode === 'killCam' && state.killCam?.active) return state.killCam.timeScale;
      return fx.timeScale;
    }


    export function moveToward(current, target, maxDelta) {
      if (Math.abs(target - current) <= maxDelta) return target;
      return current + Math.sign(target - current) * maxDelta;
    }


    export function rotateToward(current, target, maxDelta) {
      const diff = THREE.MathUtils.euclideanModulo(target - current + Math.PI, Math.PI * 2) - Math.PI;
      if (Math.abs(diff) <= maxDelta) return target;
      return current + Math.sign(diff) * maxDelta;
    }


    export function formatTime(seconds) {
      if (seconds === null || Number.isNaN(seconds)) return '--';
      const total = Math.max(0, Math.floor(seconds));
      const m = Math.floor(total / 60);
      const s = total % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }


    export function getPlayer() {
      return world.entities.find((entity) => entity.isPlayer) || world.entities.find((entity) => entity.team === 'p1');
    }


    export function getEnemy() {
      return world.entities.find((entity) => entity.team === 'p2');
    }


    export function getEntityByTeam(team) {
      return world.entities.find((entity) => entity.team === team);
    }


    export function getAliveEntities() {
      return world.entities.filter((entity) => entity && !entity.isDead && !entity.eliminated);
    }


    export function getFallbackOpponentTeam(team) {
      const opponent = world.entities.find((entity) => entity.team !== team && !entity.eliminated);
      return opponent ? opponent.team : team;
    }


    export function getTeamColor(team) {
      if (team === 'p1') return COLORS.p1;
      if (team === 'p2') return COLORS.p2;
      if (team === 'p3') return COLORS.p3;
      if (team === 'p4') return COLORS.p4;
      return COLORS.warning;
    }
