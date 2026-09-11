import * as Phaser from 'phaser';
import '@fontsource/mona-sans/index.css';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { IntroScene } from './scenes/IntroScene.js';
import { shouldRequireLandscape, triggerFullscreenAndOrientation } from './utils/mobile.js';
import { pwaInstall } from './utils/pwaInstall.js';
import { scheduleOrientationRefresh } from './utils/viewportResize.js';

const MOBILE_LANDSCAPE_MAX_DIMENSION = 1024;
const GAMEPLAY_SCENES = ['GameScene', 'UIScene'];

pwaInstall.start();

// Game configuration
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#0a3d62',
    pixelArt: false,
    roundPixels: false,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
        activePointers: 2,  // support multi-touch (plant + scroll prevention)
        touch: {
            target: null,   // auto
            capture: true,  // prevent default browser touch gestures on canvas
        },
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
        },
    },
    scene: [BootScene, MenuScene, IntroScene, GameScene, UIScene, GameOverScene],
};

const game = new Phaser.Game(config);
if (typeof window !== 'undefined') {
    window.__game = game;
}

function syncMobileOrientationLock() {
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    const portraitLocked = shouldRequireLandscape(
        window.innerWidth,
        window.innerHeight,
        isTouchDevice,
        MOBILE_LANDSCAPE_MAX_DIMENSION
    );

    document.body.classList.toggle('landscape-required', portraitLocked);

    GAMEPLAY_SCENES.forEach((sceneKey) => {
        if (portraitLocked) {
            if (game.scene.isActive(sceneKey)) {
                game.scene.pause(sceneKey);
            }
            return;
        }

        if (game.scene.isPaused(sceneKey)) {
            game.scene.resume(sceneKey);
        }
    });

    if (portraitLocked) {
        game.sound.pauseAll();
    } else if (document.hasFocus()) {
        game.sound.resumeAll();
    }
}

syncMobileOrientationLock();

function resizeGameToContainer() {
    const container = document.getElementById('game-container');
    const bounds = container?.getBoundingClientRect();
    if (bounds?.width > 0 && bounds?.height > 0) {
        game.scale.resize(Math.round(bounds.width), Math.round(bounds.height));
    }
    game.scale.refresh();
    syncMobileOrientationLock();
}

// Handle window focus for audio
window.addEventListener('blur', () => {
    game.sound.pauseAll();
});

window.addEventListener('focus', () => {
    syncMobileOrientationLock();
});

// Prevent pinch-to-zoom and other unwanted gestures on the game container
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());

let cancelOrientationRefresh = null;

// Android reports several intermediate viewport sizes while rotating. Re-fit
// across the whole transition, then let responsive scenes rebuild once.
window.addEventListener('orientationchange', () => {
    if (document.activeElement instanceof window.HTMLElement) {
        document.activeElement.blur();
    }
    if (cancelOrientationRefresh) cancelOrientationRefresh();
    cancelOrientationRefresh = scheduleOrientationRefresh(
        () => resizeGameToContainer(),
        () => window.dispatchEvent(new window.Event('refugia:orientation-settled'))
    );
});

// Also listen for resize to handle split-screen / multi-window on tablets
window.addEventListener('resize', () => {
    resizeGameToContainer();
});

export { triggerFullscreenAndOrientation };

// Fullscreen needs transient user activation. On touch devices pointerdown
// does not grant it (only pointerup/click/touchend do), so listen on click.
const triggerAutoFullscreen = () => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (isTouch) {
        triggerFullscreenAndOrientation();
    }
    window.removeEventListener('click', triggerAutoFullscreen);
};
window.addEventListener('click', triggerAutoFullscreen, { once: true });

if (typeof window !== 'undefined' && 'serviceWorker' in window.navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
        const serviceWorkerUrl = new window.URL('./sw.js', window.location.href);
        window.navigator.serviceWorker.register(serviceWorkerUrl, { scope: './' }).catch(() => {});
    });
}

export default game;
