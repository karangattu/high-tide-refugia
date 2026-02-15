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

        // Water visual (tiled sprite for wave animation effect)
        this.waterSprite = scene.add.tileSprite(
            startX / 2,
            height / 2,
            startX,
            height,
            'water'
        );
        this.waterSprite.setOrigin(0.5, 0.5);
        this.waterSprite.setDepth(5);

        // Water edge highlight
        this.waterEdge = scene.add.rectangle(
            startX,
            height / 2,
            8,
            height,
            0x3498db,
            0.8
        );
        this.waterEdge.setDepth(6);

        // Foam particles at the edge
        this.foamEmitter = scene.add.particles(startX, 0, 'seed', {
            y: { min: 0, max: height },
            speedX: { min: 10, max: 30 },
            lifespan: 1500,
            quantity: 1,
            frequency: 200,
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.6, end: 0 },
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

        // Update edge position
        this.waterEdge.setPosition(this.currentX, this.scene.scale.height / 2);

        // Update foam emitter position
        this.foamEmitter.setPosition(this.currentX, 0);

        // Animate water tiles for wave effect
        this.waterSprite.tilePositionX += 0.5;
        this.waterSprite.tilePositionY += 0.2;

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
        this.waterEdge.setPosition(this.startX, this.scene.scale.height / 2);
    }
}
