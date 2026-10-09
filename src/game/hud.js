import * as THREE from 'three';
import { CONFIG } from './config.js';
import { bannerEl, bestTimeEl, bestTimeEnd, canvasWrap, dashCooldownEl, leaderboardList, leaderboardOverlay, playerPanelsEl, popupsEl, roundPipsEl, timerEl } from './dom.js';
import { getWeaponConfig, getWeaponState } from './entities.js';
import { getActiveGameMode } from './menu.js';
import { hudPanels, state, world } from './state.js';
import { formatTime, getPlayer, getTeamColor } from './util.js';

    export function setupHUD() {
      buildPlayerPanels();
      updateRoundPips();
      updateBestTimeUI();
      updateHUD();
    }


    export function buildPlayerPanels() {
      if (!playerPanelsEl) return;
      playerPanelsEl.innerHTML = '';
      hudPanels.clear();
      const mode = getActiveGameMode();
      const positions = mode.playerCount > 2
        ? ['tl', 'tr', 'bl', 'br']
        : ['tl', 'tr'];
      world.entities.forEach((entity, index) => {
        const panel = document.createElement('div');
        panel.className = `panel playerPanel pos-${positions[index] || 'tl'}${mode.playerCount > 2 ? ' compact' : ''}`;

        const nameTag = document.createElement('div');
        nameTag.className = `nameTag ${entity.team}`;
        nameTag.textContent = entity.displayName || `Player ${index + 1}`;
        panel.appendChild(nameTag);

        const livesInfo = document.createElement('div');
        livesInfo.className = 'livesInfo';
        livesInfo.textContent = 'Lives: -';
        panel.appendChild(livesInfo);

        const hpWrap = document.createElement('div');
        hpWrap.className = 'hpWrap';
        const hpLabel = document.createElement('div');
        hpLabel.className = 'hpLabel';
        hpLabel.textContent = 'Health';
        const hpBar = document.createElement('div');
        hpBar.className = 'hpBar';
        for (let i = 0; i < 10; i++) {
          const seg = document.createElement('span');
          seg.className = 'hpSeg';
          hpBar.appendChild(seg);
        }
        hpWrap.appendChild(hpLabel);
        hpWrap.appendChild(hpBar);
        panel.appendChild(hpWrap);

        const weaponInfo = document.createElement('div');
        weaponInfo.className = 'weaponInfo';
        const weaponIcon = document.createElement('span');
        weaponIcon.className = 'weaponIcon';
        const weaponName = document.createElement('span');
        weaponName.className = 'weaponName';
        const weaponAmmo = document.createElement('span');
        weaponAmmo.className = 'weaponAmmo';
        const weaponReserve = document.createElement('span');
        weaponReserve.className = 'weaponReserve';
        weaponInfo.append(weaponIcon, weaponName, weaponAmmo, weaponReserve);
        panel.appendChild(weaponInfo);

        playerPanelsEl.appendChild(panel);
        hudPanels.set(entity.id, { panel, hpBar, livesInfo, weaponInfo, weaponIcon, weaponName, weaponAmmo, weaponReserve });
      });
    }


    export function updateBestTimeUI() {
      const bestText = `Best win time: ${formatTime(state.bestWinTime)}`;
      bestTimeEl.textContent = bestText;
      bestTimeEnd.textContent = bestText;
    }


    export function updateMuzzleFlash(entity, dt) {
      if (!entity.muzzle) return;
      if (entity.muzzle.visible) {
        entity.muzzle.life -= dt;
        if (entity.muzzle.life <= 0) entity.muzzle.visible = false;
      }
    }


    export function updateHUD() {
      const showLives = state.gameMode === 'deathmatch';
      world.entities.forEach((entity) => {
        const panel = hudPanels.get(entity.id);
        if (!panel) return;
        updateHpBar(panel.hpBar, entity.hp, entity.team);
        updateWeaponDisplay(panel, entity);
        if (panel.livesInfo) {
          panel.livesInfo.style.display = showLives ? 'block' : 'none';
          panel.livesInfo.textContent = `Lives: ${Math.max(0, entity.lives ?? 0)}`;
        }
        panel.panel.classList.toggle('down', entity.isDead || entity.eliminated);
      });
      timerEl.textContent = `TIME: ${formatTime(state.timeLeft)}`;
      timerEl.classList.toggle('low', state.timeLeft <= 30);
      const player = getPlayer();
      const cooldownPct = player
        ? THREE.MathUtils.clamp(player.dashCooldown / CONFIG.movement.dashCooldown, 0, 1)
        : 0;
      dashCooldownEl.style.width = `${cooldownPct * 100}%`;
      updateLeaderboard();
    }


    export function updateLeaderboard() {
      if (!leaderboardOverlay || !leaderboardList) return;
      const shouldShow = state.showLeaderboard && state.gameMode === 'deathmatch' && state.mode === 'playing';
      leaderboardOverlay.classList.toggle('visible', shouldShow);
      if (!shouldShow) return;

      leaderboardList.innerHTML = '';
      const sorted = [...world.entities].sort((a, b) => {
        const livesDiff = (b.lives ?? 0) - (a.lives ?? 0);
        if (livesDiff !== 0) return livesDiff;
        return (b.hp ?? 0) - (a.hp ?? 0);
      });
      sorted.forEach((entity) => {
        const row = document.createElement('div');
        row.className = 'leaderboardRow';
        const label = document.createElement('div');
        label.className = 'label';
        const badge = document.createElement('span');
        badge.className = 'leaderboardBadge';
        badge.style.background = `#${getTeamColor(entity.team).toString(16).padStart(6, '0')}`;
        const name = document.createElement('span');
        name.textContent = entity.displayName || entity.id;
        label.append(badge, name);
        const lives = document.createElement('span');
        lives.textContent = `Lives: ${Math.max(0, entity.lives ?? 0)}`;
        row.append(label, lives);
        leaderboardList.appendChild(row);
      });
    }


    export function updateWeaponDisplay(panel, entity) {
      const isSwitching = entity.weapon.switchTimer > 0 && entity.weapon.pending;
      const activeId = isSwitching ? entity.weapon.pending : entity.weapon.id;
      const weapon = getWeaponConfig(activeId);
      const state = getWeaponState(entity, activeId);
      if (!weapon || !state) return;

      panel.weaponIcon.textContent = weapon.name[0];
      panel.weaponName.textContent = weapon.name;
      if (isSwitching) {
        panel.weaponAmmo.textContent = 'Switching';
        panel.weaponReserve.textContent = '';
      } else {
        panel.weaponAmmo.textContent = `${state.ammo}/${weapon.magSize}`;
        panel.weaponReserve.textContent = `[${state.reserve}]`;
      }
      panel.weaponInfo.classList.toggle('reloading', !isSwitching && state.reloadTimer > 0);
      panel.weaponInfo.classList.toggle('switching', isSwitching);
    }


    export function updateHpBar(container, hp, team) {
      const segments = container.querySelectorAll('.hpSeg');
      const activeCount = Math.ceil(hp / 10);
      segments.forEach((seg, index) => {
        seg.classList.toggle('active', index < activeCount);
        seg.classList.toggle(team, index < activeCount);
      });
    }


    export function updateRoundPips() {
      if (state.gameMode === 'deathmatch') {
        roundPipsEl.style.opacity = '0';
        return;
      }
      roundPipsEl.style.opacity = '1';
      const pips = roundPipsEl.querySelectorAll('.pip');
      pips.forEach((pip, index) => {
        pip.classList.remove('p1', 'p2');
        if (state.roundResults[index] === 'p1') pip.classList.add('p1');
        if (state.roundResults[index] === 'p2') pip.classList.add('p2');
      });
    }


    export function showBanner(text) {
      bannerEl.textContent = text;
      bannerEl.classList.add('show');
      setTimeout(() => bannerEl.classList.remove('show'), 1000);
    }


    export function spawnPopup(text, worldPos, kind = 'close', duration = 0.6) {
      if (!popupsEl) return;
      const el = document.createElement('div');
      el.className = `popup ${kind}`;
      el.textContent = text;
      popupsEl.appendChild(el);
      world.popups.push({
        el,
        pos: worldPos.clone(),
        life: duration,
        maxLife: duration
      });
    }


    export function updatePopups(dt) {
      if (!popupsEl) return;
      const rect = canvasWrap.getBoundingClientRect();
      world.popups = world.popups.filter((popup) => {
        popup.life -= dt;
        const t = 1 - THREE.MathUtils.clamp(popup.life / popup.maxLife, 0, 1);

        const projected = popup.pos.clone().project(world.camera);
        const x = (projected.x * 0.5 + 0.5) * rect.width;
        const y = (-projected.y * 0.5 + 0.5) * rect.height;

        popup.el.style.left = `${x}px`;
        popup.el.style.top = `${y - t * 26}px`;
        popup.el.style.opacity = String(1 - t);

        if (popup.life <= 0) {
          popup.el.remove();
          return false;
        }
        return true;
      });
    }
