import { setupAudio } from './game/audio.js';
import { loadAssets } from './game/assets.js';
import { bindInput } from './game/input.js';
import { animate } from './game/loop.js';
import { applyGameMode, setMode, setupMenuModes } from './game/menu.js';
import { createReticle, setupCamera, setupLights, setupRenderer, setupScene } from './game/scene.js';
import { state } from './game/state.js';
import { setupTouch } from './game/touch.js';
import { setupVisualToggle } from './game/visuals.js';

	    init();


	    async function init() {
	      setupRenderer();
	      setupScene();
	      setupCamera();
	      setupLights();
	      bindInput();
	      setupAudio();
	      setupTouch();
	      await loadAssets();
	      setupVisualToggle();
	      setupMenuModes();
	      applyGameMode(state.gameMode);
	      createReticle();
	      setMode('menu');
	      animate();
	    }
