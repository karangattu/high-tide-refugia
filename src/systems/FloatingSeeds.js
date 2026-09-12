import * as Phaser from 'phaser';

const MIN_DELAY = 4000;
const MAX_DELAY = 8000;
const POP_IN_MS = 350;
const VISIBLE_MIN = 3200;
const VISIBLE_MAX = 5200;

/**
 * Buoyant seed pods that surface in the marsh near the tide edge. Unlike the
 * rails, seeds do not travel across the screen: each pod pops into view,
 * lingers for a few seconds, then fades away. Tapping a pod while it is
 * visible grants a bonus seed.
 */
export class FloatingSeeds {
    constructor(scene) {
        this.scene = scene;
        this.pods = [];
        this.spawnEvent = scene.time.addEvent({
            delay: Phaser.Math.Between(MIN_DELAY, MAX_DELAY),
            loop: true,
            callback: () => this.tick(),
        });

        scene.events.once('shutdown', () => this.destroy());
    }

    tick() {
        if (this.scene.isPaused || this.scene.isGameOver || this.scene.tutorialActive) return;
        this.spawn();
    }

    spawn() {
        const scene = this.scene;
        const { width } = scene.scale;
        const waterX = scene.waterSystem ? scene.waterSystem.getWaterX() : 40;
        const y = Phaser.Math.Between(scene.marshTop + 14, scene.marshBottom - 14);
        const x = Phaser.Math.Clamp(
            waterX + Phaser.Math.Between(24, 180),
            50,
            width - 170
        );

        const targetScale = Phaser.Math.FloatBetween(0.13, 0.17);
        const pod = scene.add.image(x, y, 'seed')
            .setScale(0)
            .setAlpha(0)
            .setDepth(6);

        // Pop into view.
        scene.tweens.add({
            targets: pod,
            scale: targetScale,
            alpha: 1,
            duration: POP_IN_MS,
            ease: 'Back.easeOut',
        });

        // Gentle surface bob while it is visible.
        scene.tweens.add({
            targets: pod,
            y: y - 8,
            duration: Phaser.Math.Between(900, 1300),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: POP_IN_MS,
        });

        const visibleFor = Phaser.Math.Between(VISIBLE_MIN, VISIBLE_MAX);
        pod.lifeTimer = scene.time.delayedCall(
            POP_IN_MS + visibleFor,
            () => this.fadeOut(pod)
        );

        pod.setInteractive({ useHandCursor: true });
        pod.on('pointerdown', (_pointer, _lx, _ly, event) => {
            if (event && typeof event.stopPropagation === 'function') {
                event.stopPropagation();
            }
            this.collect(pod);
        });
        pod.on('pointerover', () => pod.setTint(0xffe08a));
        pod.on('pointerout', () => pod.clearTint());

        this.pods.push(pod);
        return pod;
    }

    fadeOut(pod) {
        if (!pod || !pod.active || !this.pods.includes(pod)) return;
        this.clearLifeTimer(pod);
        pod.disableInteractive();

        this.scene.tweens.killTweensOf(pod);
        this.scene.tweens.add({
            targets: pod,
            alpha: 0,
            scale: pod.scaleX * 0.6,
            duration: 450,
            ease: 'Sine.easeIn',
            onComplete: () => this.remove(pod),
        });
    }

    collect(pod) {
        if (!this.pods.includes(pod) || !pod.active) return false;
        this.clearLifeTimer(pod);
        this.scene.seedBank?.collectFloatingSeed?.(pod.x, pod.y);
        // Guard the next scene-level tap so it doesn't also try to plant.
        this.scene.lastSeedTapTime = Date.now();
        this.remove(pod);
        return true;
    }

    clearLifeTimer(pod) {
        if (pod.lifeTimer) {
            pod.lifeTimer.remove(false);
            pod.lifeTimer = null;
        }
    }

    remove(pod) {
        if (!pod) return;
        this.clearLifeTimer(pod);
        this.pods = this.pods.filter(entry => entry !== pod);
        if (pod.active) {
            this.scene.tweens.killTweensOf(pod);
            pod.destroy();
        }
    }

    destroy() {
        if (this.spawnEvent) {
            this.spawnEvent.remove(false);
            this.spawnEvent = null;
        }
        this.pods.forEach(pod => {
            this.clearLifeTimer(pod);
            if (pod.active) {
                this.scene.tweens.killTweensOf(pod);
                pod.destroy();
            }
        });
        this.pods = [];
    }
}
