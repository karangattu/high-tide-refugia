import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { IntroScene } from './scenes/IntroScene.js';

const MOBILE_PHONE_MAX_DIMENSION = 768;
const GAMEPLAY_SCENES = ['GameScene', 'UIScene'];

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

// Create the game instance
const game = new Phaser.Game(config);

function isPhonePortrait() {
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    const smallestSide = Math.min(window.innerWidth, window.innerHeight);

    return isTouchDevice
        && smallestSide <= MOBILE_PHONE_MAX_DIMENSION
        && window.innerHeight > window.innerWidth;
}

function syncMobileOrientationLock() {
    const portraitLocked = isPhonePortrait();

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

// Re-fit game on orientation change (mobile)
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        game.scale.refresh();
        syncMobileOrientationLock();
    }, 200);
});

// Also listen for resize to handle split-screen / multi-window on tablets
window.addEventListener('resize', () => {
    game.scale.refresh();
    syncMobileOrientationLock();
});

export default game;
