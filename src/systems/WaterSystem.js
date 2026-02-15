import Phaser from 'phaser';

export class WaterSystem {
    constructor(scene, startX = 0) {
        this.scene = scene;
        this.startX = startX;
        this.currentX = startX;
        this.baseSpeed = 8; // Pixels per second
        this.currentSpeed = this.baseSpeed;
        this.isKingTide = false;

        const { width, height } = scene.scale;

        // ── Deep water body ─────────────────────────────
        this.waterSprite = scene.add.tileSprite(
            startX / 2,
            height / 2,
            startX,
            height,
            'water'
        );
        this.waterSprite.setOrigin(0.5, 0.5);
        this.waterSprite.setDepth(5);

        // ── Shoreline / foam edge using the new 'water_edge' texture ──
        this.shoreEdge = scene.add.tileSprite(
            startX + 8,
            height / 2,
            16,
            height,
            'water_edge'
        );
        this.shoreEdge.setOrigin(0.5, 0.5);
        this.shoreEdge.setDepth(6);

        // ── Thin bright water-edge glow line ──
        this.waterEdge = scene.add.rectangle(
            startX,
            height / 2,
            4,
            height,
            0x5bbee8,
            0.5
        );
        this.waterEdge.setDepth(7);

        // ── Foam particles at the edge ──
        this.foamEmitter = scene.add.particles(startX, 0, 'seed', {
            y: { min: 0, max: height },
            speedX: { min: 6, max: 20 },
            speedY: { min: -8, max: 8 },
            lifespan: 2000,
            quantity: 1,
            frequency: 180,
            scale: { start: 0.35, end: 0 },
            alpha: { start: 0.5, end: 0 },
            tint: 0xffffff,
        });
    }

    update(delta) {
        // Move water edge rightward
        const movement = this.currentSpeed * (delta / 1000);
        this.currentX += movement;

        // Update water sprite width and position
        this.waterSprite.setPosition(this.currentX / 2, this.scene.scale.height / 2);
        this.waterSprite.width = this.currentX;

        // Update shore edge
        this.shoreEdge.setPosition(this.currentX + 8, this.scene.scale.height / 2);
        this.shoreEdge.tilePositionY += 0.15; // slow downward drift for organic feel

        // Update glow-edge position
        this.waterEdge.setPosition(this.currentX, this.scene.scale.height / 2);

        // Update foam emitter position
        this.foamEmitter.setPosition(this.currentX, 0);

        // Animate water tiles for wave effect (multi-axis drift)
        this.waterSprite.tilePositionX += 0.5;
        this.waterSprite.tilePositionY += 0.18;

        return this.currentX;
    }

    getWaterX() {
        return this.currentX;
    }

    setSpeed(speed) {
        this.currentSpeed = speed;
    }

    triggerKingTide() {
        this.isKingTide = true;
        this.currentSpeed = this.baseSpeed * 2;

        // Visual surge effect
        this.scene.tweens.add({
            targets: this.waterEdge,
            scaleX: 2,
            alpha: 1,
            duration: 300,
            yoyo: true,
            repeat: 5,
        });

        // Camera shake
        this.scene.cameras.main.shake(500, 0.01);

        // King tide warning text
        const warning = this.scene.add.text(
            this.scene.scale.width / 2,
            100,
            '⚠️ KING TIDE! ⚠️',
            {
                fontFamily: 'Outfit',
                fontSize: '48px',
                fontStyle: 'bold',
                color: '#ff6b6b',
                stroke: '#000000',
                strokeThickness: 6,
                resolution: window.devicePixelRatio || 2,
            }
        ).setOrigin(0.5).setDepth(100);

        this.scene.tweens.add({
            targets: warning,
            scale: { from: 0.5, to: 1.2 },
            alpha: { from: 1, to: 0 },
            duration: 2000,
            onComplete: () => warning.destroy(),
        });
    }

    reset() {
        this.currentX = this.startX;
        this.currentSpeed = this.baseSpeed;
        this.isKingTide = false;

        this.waterSprite.setPosition(this.startX / 2, this.scene.scale.height / 2);
        this.waterSprite.width = this.startX;
        this.shoreEdge.setPosition(this.startX + 8, this.scene.scale.height / 2);
        this.waterEdge.setPosition(this.startX, this.scene.scale.height / 2);
    }
}
