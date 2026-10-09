import * as THREE from 'three';
import { COLORS, CONFIG } from './config.js';
import { canvas } from './dom.js';
import { world } from './state.js';

    // Phones/tablets (coarse pointer) get a lighter renderer: cheaper shadows,
    // lower pixel ratio and no MSAA.
    const LOW_QUALITY = window.matchMedia('(pointer: coarse)').matches;

    export function setupRenderer() {
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW_QUALITY, alpha: false });
      const maxDpr = LOW_QUALITY ? Math.min(CONFIG.render.maxDpr, 1.5) : CONFIG.render.maxDpr;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = LOW_QUALITY ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
      world.renderer = renderer;
      resize();
      window.addEventListener('resize', resize);
    }


    export function setupScene() {
      world.scene.background = new THREE.Color(0xCFE6FF);
      world.scene.fog = new THREE.Fog(0xEFD9B1, 24, 70);
    }


    export function setupCamera() {
      const camera = new THREE.PerspectiveCamera(
        CONFIG.camera.fov,
        CONFIG.render.referenceWidth / CONFIG.render.referenceHeight,
        CONFIG.camera.near,
        CONFIG.camera.far
      );
      camera.position.copy(CONFIG.camera.position);
      camera.lookAt(CONFIG.camera.lookAt);
      world.camera = camera;
    }


    export function setupLights() {
      const ambient = new THREE.AmbientLight(0xffffff, CONFIG.lighting.ambient);
      const hemi = new THREE.HemisphereLight(0xffffff, 0x96754b, CONFIG.lighting.hemi);
      const dir = new THREE.DirectionalLight(0xfff2d6, CONFIG.lighting.dir);
      dir.position.set(12, 24, 8);
      dir.castShadow = true;
      dir.shadow.mapSize.set(LOW_QUALITY ? 512 : 1024, LOW_QUALITY ? 512 : 1024);
      dir.shadow.camera.left = -20;
      dir.shadow.camera.right = 20;
      dir.shadow.camera.top = 20;
      dir.shadow.camera.bottom = -20;
      dir.shadow.camera.near = 1;
      dir.shadow.camera.far = 60;
      world.scene.add(ambient, hemi, dir);
    }


    export function resize() {
      const wrap = document.getElementById('canvasWrap');
      const width = wrap.clientWidth;
      const height = wrap.clientHeight;
      world.renderer.setSize(width, height, false);
      if (world.camera) {
        world.camera.aspect = width / height;
        world.camera.updateProjectionMatrix();
      }
    }

    export function createReticle() {
      world.reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.18, 0.24, 28),
        new THREE.MeshBasicMaterial({ color: COLORS.near, transparent: true, opacity: 0.6 })
      );
      world.reticle.rotation.x = -Math.PI / 2;
      world.reticle.position.set(0, 0.02, 0);
      world.scene.add(world.reticle);
    }
