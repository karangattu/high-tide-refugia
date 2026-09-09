import * as Phaser from 'phaser';

export class WaterSystem {
    constructor(scene, startX = 0) {
        this.scene = scene;
        this.startX = startX;
        this.currentX = startX;
        this.baseSpeed = 8; // Pixels per second
        this.currentSpeed = this.baseSpeed;
        this.isKingTide = false;
        this.elapsed = 0;

        const { width, height } = scene.scale;

        // ── Water body (animated tile fill) ─────────────
        this.waterSprite = scene.add.tileSprite(
            startX / 2,
            height / 2,
            startX,
            height,
            'water'
        );
        this.waterSprite.setOrigin(0.5, 0.5);
        this.waterSprite.setDepth(5);

        // ── Vertical depth shade (darkens toward the bottom) ──
        this.waterShade = scene.add.image(startX / 2, height / 2, 'water_shade');
        this.waterShade.setScale(Math.max(startX, 1), height / 64);
        this.waterShade.setDepth(5);

        // ── Shimmer streaks drifting inside the water ──
        this.shimmers = [];
        for (let i = 0; i < 10; i++) {
            const line = scene.add.rectangle(
                0,
                Phaser.Math.Between(10, height - 10),
                Phaser.Math.Between(30, 110),
                2,
                0x9fd8e8,
                Phaser.Math.FloatBetween(0.06, 0.2)
            ).setDepth(5);
            line.fx = Math.random();
            line.phase = Math.random() * Math.PI * 2;
            line.baseAlpha = line.alpha;
            this.shimmers.push(line);
        }

        // ── Wet sand band soaking the marsh just ahead of the edge ──
        this.wetBand = scene.add.rectangle(startX + 13, height / 2, 26, height, 0x2b2a20, 0.5);
        this.wetBand.setDepth(4);

        // ── Bright waterline ──
        this.waterEdge = scene.add.rectangle(
            startX,
            height / 2,
            3,
            height,
            0xbfeaf6,
            0.8
        );
        this.waterEdge.setDepth(7);

        // ── Foam blobs bobbing along the waterline ──
        this.foamBlobs = [];
        for (let i = 0; i < 12; i++) {
            const blob = scene.add.ellipse(
                startX,
                Phaser.Math.Between(8, height - 8),
                Phaser.Math.Between(7, 16),
                Phaser.Math.Between(4, 8),
                0xffffff,
                Phaser.Math.FloatBetween(0.25, 0.5)
            ).setDepth(6);
            blob.phase = Math.random() * Math.PI * 2;
            blob.baseAlpha = blob.alpha;
            this.foamBlobs.push(blob);
        }

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
        this.elapsed += delta;

        // Move water edge rightward
        const movement = this.currentSpeed * (delta / 1000);
        this.currentX += movement;

        const h = this.scene.scale.height;
        const t = this.currentX;

        // Update water body width / position and drift the tiles
        this.waterSprite.setPosition(t / 2, h / 2);
        this.waterSprite.width = t;
        this.waterSprite.tilePositionX += 0.5;
        this.waterSprite.tilePositionY += 0.18;

        // Stretch the depth shade to match
        this.waterShade.setPosition(t / 2, h / 2);
        this.waterShade.setScale(Math.max(t, 1), h / 64);

        // Shimmer streaks spread across the water surface
        this.shimmers.forEach((line) => {
            line.phase += delta * 0.0015;
            line.x = line.fx * t;
            line.alpha = line.baseAlpha * (0.55 + 0.45 * Math.sin(line.phase));
        });

        // Wet band, bright waterline and bobbing foam follow the edge
        this.wetBand.setPosition(t + 13, h / 2);
        this.waterEdge.setPosition(t, h / 2);
        this.foamBlobs.forEach((blob) => {
            blob.x = t + 2 + Math.sin(this.elapsed * 0.002 + blob.phase) * 3;
            blob.alpha = blob.baseAlpha * (0.7 + 0.3 * Math.sin(this.elapsed * 0.003 + blob.phase * 2));
        });

        // Update foam emitter position
        this.foamEmitter.setPosition(t, 0);

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

        const h = this.scene.scale.height;

        this.waterSprite.setPosition(this.startX / 2, h / 2);
        this.waterSprite.width = this.startX;
        this.waterShade.setPosition(this.startX / 2, h / 2);
        this.waterShade.setScale(Math.max(this.startX, 1), h / 64);
        this.wetBand.setPosition(this.startX + 13, h / 2);
        this.waterEdge.setPosition(this.startX, h / 2);
    }
}
