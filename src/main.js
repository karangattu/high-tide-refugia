import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { IntroScene } from './scenes/IntroScene.js';

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

// Handle window focus for audio
window.addEventListener('blur', () => {
    game.sound.pauseAll();
});

window.addEventListener('focus', () => {
    game.sound.resumeAll();
});

// Prevent pinch-to-zoom and other unwanted gestures on the game container
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());

// Re-fit game on orientation change (mobile)
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        game.scale.refresh();
    }, 200);
});

// Also listen for resize to handle split-screen / multi-window on tablets
window.addEventListener('resize', () => {
    game.scale.refresh();
});

export default game;
