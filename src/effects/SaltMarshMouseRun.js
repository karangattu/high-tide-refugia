import { getEntityScaleFactor } from '../utils/mobile.js';

const MOUSE_SCALE = 0.12;
const MOUSE_RUN_INTERVAL = 15_000;
const MOUSE_SPEED_MULTIPLIER = 1.2;

function getRailReferenceSpeed(scene) {
    const liveRailSpeeds = (scene.rails?.children?.entries || [])
        .filter(rail => rail.isAlive !== false && Number.isFinite(rail.baseSpeed))
        .map(rail => rail.baseSpeed);
    if (liveRailSpeeds.length > 0) return Math.max(...liveRailSpeeds);

    const levelSpeedMultiplier = scene.levelManager
        ?.getCurrentConfig?.()
        ?.railSpeedMultiplier ?? 1;
    return 120 * levelSpeedMultiplier;
}

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
    const destinationX = scene.scale.width + offscreenPadding;
    const mouseSpeed = getRailReferenceSpeed(scene) * MOUSE_SPEED_MULTIPLIER;
    const crossingDuration = ((destinationX - mouse.x) / mouseSpeed) * 1000;

    scene.tweens.add({
        targets: mouse,
        x: destinationX,
        duration: crossingDuration,
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
