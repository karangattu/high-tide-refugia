import Phaser from 'phaser';

export class ParticleManager {
    constructor(scene) {
        this.scene = scene;
    }

    emitDirt(x, y) {
        const particles = this.scene.add.particles(x, y, 'dirt', {
            speed: { min: 50, max: 150 },
            angle: { min: 230, max: 310 },
            lifespan: 600,
            quantity: 8,
            scale: { start: 1, end: 0.3 },
            alpha: { start: 1, end: 0 },
            gravityY: 300,
        });

        // Auto-destroy emitter after burst
        this.scene.time.delayedCall(100, () => {
            particles.stop();
        });
        this.scene.time.delayedCall(700, () => {
            particles.destroy();
        });
    }

    emitHearts(x, y) {
        const particles = this.scene.add.particles(x, y, 'heart', {
            speed: { min: 30, max: 80 },
            angle: { min: 250, max: 290 },
            lifespan: 1500,
            quantity: 5,
            scale: { start: 1, end: 0.5 },
            alpha: { start: 1, end: 0 },
            gravityY: -50,
        });

        this.scene.time.delayedCall(100, () => {
            particles.stop();
        });
        this.scene.time.delayedCall(1600, () => {
            particles.destroy();
        });
    }

    emitWaterSplash(x, y) {
        const particles = this.scene.add.particles(x, y, 'seed', {
            speed: { min: 100, max: 200 },
            angle: { min: 200, max: 340 },
            lifespan: 500,
            quantity: 10,
            scale: { start: 0.5, end: 0 },
            tint: 0x3498db,
            alpha: { start: 0.8, end: 0 },
            gravityY: 400,
        });

        this.scene.time.delayedCall(100, () => {
            particles.stop();
        });
        this.scene.time.delayedCall(600, () => {
            particles.destroy();
        });
    }

    createFloatingSeeds(width, height) {
        return this.scene.add.particles(0, 0, 'seed', {
            x: { min: 0, max: width },
            y: { min: -20, max: 0 },
            lifespan: 10000,
            speedY: { min: 15, max: 30 },
            speedX: { min: -30, max: 30 },
            scale: { start: 0.6, end: 0.3 },
            alpha: { start: 0.9, end: 0.2 },
            rotate: { min: 0, max: 360 },
            frequency: 2000,
            blendMode: Phaser.BlendModes.ADD,
        });
    }

    emitScorePopup(x, y, text, color = '#27ae60') {
        const popup = this.scene.add.text(x, y, text, {
            fontFamily: 'Outfit',
            fontSize: '24px',
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        this.scene.tweens.add({
            targets: popup,
            y: y - 50,
            alpha: 0,
            scale: 1.5,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => popup.destroy(),
        });
    }
}
