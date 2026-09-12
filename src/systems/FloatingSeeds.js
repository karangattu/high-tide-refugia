import * as Phaser from 'phaser';

const MIN_DELAY = 6500;
const MAX_DELAY = 11000;
const DRIFT_SPEED = 48;

/**
 * Buoyant seed pods that ride the incoming tide foam. Tapping a pod grants a
 * bonus seed and gives players something to do between rail spawns.
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
        const minY = scene.marshTop + 12;
        const maxY = scene.marshBottom - 12;
        const y = Phaser.Math.Between(minY, maxY);
        const x = Phaser.Math.Clamp(waterX + Phaser.Math.Between(24, 90), 40, width - 180);

        const pod = scene.add.image(x, y, 'seed')
            .setScale(Phaser.Math.FloatBetween(0.13, 0.17))
            .setDepth(6);

        scene.tweens.add({
            targets: pod,
            y: y - 9,
            duration: Phaser.Math.Between(800, 1200),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        const travel = (width - 150) - x;
        const duration = Math.max(2500, (travel / DRIFT_SPEED) * 1000);
        scene.tweens.add({
            targets: pod,
            x: x + travel,
            duration,
            ease: 'Linear',
            onComplete: () => this.remove(pod),
        });

        pod.setInteractive({ useHandCursor: true });
        pod.on('pointerdown', (_pointer, _lx, _ly, event) => {
            if (event && typeof event.stopPropagation === 'function') {
                event.stopPropagation();
            }
            this.collect(pod);
        });
        pod.on('pointerover', () => pod.setScale(pod.scaleX * 1.15, pod.scaleY * 1.15));
        pod.on('pointerout', () => pod.setScale(pod.scaleX / 1.15, pod.scaleY / 1.15));

        this.pods.push(pod);
        return pod;
    }

    collect(pod) {
        if (!this.pods.includes(pod) || !pod.active) return false;
        this.scene.seedBank?.collectFloatingSeed?.(pod.x, pod.y);
        // Guard the next scene-level tap so it doesn't also try to plant.
        this.scene.lastSeedTapTime = Date.now();
        this.remove(pod);
        return true;
    }

    remove(pod) {
        if (!pod) return;
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
            if (pod.active) {
                this.scene.tweens.killTweensOf(pod);
                pod.destroy();
            }
        });
        this.pods = [];
    }
}
