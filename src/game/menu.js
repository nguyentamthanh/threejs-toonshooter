import { buildArena, clearArena } from './arena.js';
import { BASE_ARENA, CONFIG } from './config.js';
import { bannerEl, difficultyButtons, difficultyLabelEl, hud, matchOverlay, menuOverlay, modeButtons, modeRulesEl, modeSubtitleEl, pauseOverlay, suddenDeathEl } from './dom.js';
import { clearEntities, spawnEntities } from './entities.js';
import { setupHUD } from './hud.js';
import { clearPickups } from './pickups.js';
import { state } from './state.js';

	    export function setupMenuModes() {
	      modeButtons.forEach((button) => {
	        button.addEventListener('click', () => {
	          setGameMode(button.dataset.mode);
	        });
	      });
	      setupDifficultySelect();
	      setGameMode(state.gameMode);
	    }


	    export function setupDifficultySelect() {
	      if (!difficultyButtons.length) return;
	      difficultyButtons.forEach((button) => {
	        button.addEventListener('click', () => {
	          const diff = button.dataset.diff;
	          if (!diff) return;
	          setDifficultyForMode(state.gameMode, diff);
	        });
	      });
	      updateDifficultyUI();
	    }


	    export function getDifficultyForMode(modeId) {
	      const byMode = CONFIG.difficulty?.byMode || {};
	      return byMode[modeId] || 'normal';
	    }


	    export function setDifficultyForMode(modeId, difficulty) {
	      if (!modeId) return;
	      const allowed = ['easy', 'normal', 'hard'];
	      if (!allowed.includes(difficulty)) return;
	      CONFIG.difficulty.byMode[modeId] = difficulty;
	      localStorage.setItem('tinyToonDuel_aiDifficultyByMode', JSON.stringify(CONFIG.difficulty.byMode));
	      updateDifficultyUI();
	    }


	    export function updateDifficultyUI() {
	      const current = getDifficultyForMode(state.gameMode);
	      difficultyButtons.forEach((button) => {
	        button.classList.toggle('active', button.dataset.diff === current);
	      });
	      if (difficultyLabelEl) {
	        const modeName = CONFIG.gameModes?.[state.gameMode]?.name || state.gameMode;
	        const label = current.toUpperCase();
	        difficultyLabelEl.textContent = `${modeName} AI: ${label}`;
	      }
	    }


	    export function setGameMode(modeId) {
	      if (!CONFIG.gameModes[modeId]) return;
	      state.gameMode = modeId;
	      modeButtons.forEach((button) => {
	        button.classList.toggle('active', button.dataset.mode === modeId);
	      });
	      updateMenuModeCopy();
	      updateDifficultyUI();
	    }


    export function updateMenuModeCopy() {
      if (!modeSubtitleEl || !modeRulesEl) return;
      if (state.gameMode === 'deathmatch') {
        const dm = CONFIG.gameModes.deathmatch;
        modeSubtitleEl.textContent = 'Chaotic 4-player free-for-all with limited lives.';
        modeRulesEl.textContent = `${dm.playerCount} players · ${dm.lives} lives · 1:45 time limit · Barrels hurt everyone`;
      } else {
        modeSubtitleEl.textContent = 'Fast, tight 1v1 duel in a tiny arena.';
        modeRulesEl.textContent = 'Best of 5 · 1:45 time limit · Barrels hurt both players';
      }
    }


    export function getActiveGameMode() {
      return CONFIG.gameModes[state.activeGameMode || state.gameMode] || CONFIG.gameModes.duel;
    }


    export function applyGameMode(modeId) {
      const mode = CONFIG.gameModes[modeId] || CONFIG.gameModes.duel;
      state.activeGameMode = modeId;
      hud.dataset.gamemode = modeId;

      const scale = mode.arenaScale ?? 1;
      CONFIG.arena.width = BASE_ARENA.width * scale;
      CONFIG.arena.depth = BASE_ARENA.depth * scale;
      CONFIG.arena.bounds = {
        minX: BASE_ARENA.bounds.minX * scale,
        maxX: BASE_ARENA.bounds.maxX * scale,
        minZ: BASE_ARENA.bounds.minZ * scale,
        maxZ: BASE_ARENA.bounds.maxZ * scale
      };

      clearArena();
      clearEntities();
      clearPickups();
      buildArena();
      spawnEntities();
      setupHUD();
    }


    export function setMode(mode) {
      state.mode = mode;
      hud.dataset.mode = mode;
      menuOverlay.classList.toggle('visible', mode === 'menu');
      pauseOverlay.classList.toggle('visible', mode === 'paused');
      matchOverlay.classList.toggle('visible', mode === 'matchOver');
      if (mode === 'menu') {
        bannerEl.classList.remove('show');
        suddenDeathEl.classList.remove('show');
      }
    }
