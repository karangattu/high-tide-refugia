import { getEntityScaleFactor } from '../utils/mobile.js';

const MOUSE_SCALE = 0.12;
const MOUSE_CROSSING_DURATION = 850;
const MOUSE_RUN_INTERVAL = 15_000;

export function startSaltMarshMouseRun(scene) {
    const entityScale = getEntityScaleFactor(scene.scale.width, scene.scale.height);
    const verticalPadding = 24;
    const runTop = scene.marshTop + verticalPadding;
    const runBottom = scene.marshBottom - verticalPadding;
    const y = Math.round(runTop + Math.random() * Math.max(0, runBottom - runTop));

    const mouse = scene.add.sprite(0, y, 'saltie_run_1')
        .setScale(MOUSE_SCALE * entityScale)
        .setDepth(5)
        .play('saltie_run');
    const offscreenPadding = mouse.displayWidth / 2 + 16;
    mouse.x = -offscreenPadding;

    scene.tweens.add({
        targets: mouse,
        x: scene.scale.width + offscreenPadding,
        duration: MOUSE_CROSSING_DURATION,
        ease: 'Linear',
        onComplete: () => mouse.destroy(),
    });

    return mouse;
}

export function scheduleSaltMarshMouseRuns(scene) {
    if (scene.mouseRunTimer) scene.mouseRunTimer.remove();

    scene.mouseRunTimer = scene.time.addEvent({
        delay: MOUSE_RUN_INTERVAL,
        loop: true,
        callback: () => {
            if (scene.isPaused || scene.isGameOver || scene.tutorialActive) return;
            startSaltMarshMouseRun(scene);
        },
    });

    return scene.mouseRunTimer;
}
