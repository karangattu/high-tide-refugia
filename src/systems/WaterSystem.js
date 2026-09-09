export class WaterSystem {
    constructor(scene, startX = 0, topY = 0, bottomY = null) {
        this.scene = scene;
        this.startX = startX;
        this.currentX = startX;
        this.baseSpeed = 8;
        this.currentSpeed = this.baseSpeed;
        this.isKingTide = false;
        this.elapsed = 0;

        const { height } = scene.scale;
        this.topY = topY || 0;
        this.bottomY = bottomY || height;
        this.stripH = this.bottomY - this.topY;
        this.centerY = (this.topY + this.bottomY) / 2;

        this.wetSandGraphics = scene.add.graphics().setDepth(4);
        this.waterGraphics = scene.add.graphics().setDepth(5);
        this.foamGraphics = scene.add.graphics().setDepth(6);

        this.foamEmitter = scene.add.particles(startX, 0, 'seed', {
            y: { min: this.topY, max: this.bottomY },
            speedX: { min: 4, max: 18 },
            speedY: { min: -10, max: 10 },
            lifespan: 1400,
            quantity: 1,
            frequency: 140,
            scale: { start: 0.28, end: 0 },
            alpha: { start: 0.6, end: 0 },
            tint: 0xffffff,
        }).setDepth(7);
    }

    getWaveOffset(y, t) {
        const s1 = Math.sin(y * 0.016 + t * 0.0022) * 13;
        const s2 = Math.cos(y * 0.038 - t * 0.0031) * 7;
        const s3 = Math.sin(y * 0.082 + t * 0.005) * 3;
        const surge = Math.sin(t * 0.0018) * 8;
        return s1 + s2 + s3 + surge;
    }

    getWaterX(y) {
        const t = this.elapsed;
        const offset = y !== undefined ? this.getWaveOffset(y, t) : Math.sin(t * 0.0018) * 8;
        return this.currentX + offset;
    }

    update(delta) {
        this.elapsed += delta;

        const movement = this.currentSpeed * (delta / 1000);
        this.currentX += movement;

        const step = 14;
        const points = [];
        for (let y = this.topY; y <= this.bottomY + step; y += step) {
            const clampedY = Math.min(y, this.bottomY);
            points.push({ x: this.getWaterX(clampedY), y: clampedY });
        }

        const t = this.elapsed;

        this.wetSandGraphics.clear();
        this.wetSandGraphics.fillStyle(0x1d1a12, 0.42);
        this.wetSandGraphics.beginPath();
        this.wetSandGraphics.moveTo(0, this.topY);
        for (let i = 0; i < points.length; i++) {
            const surgeLead = 14 + Math.sin(points[i].y * 0.02 + t * 0.0015) * 6;
            this.wetSandGraphics.lineTo(points[i].x + surgeLead, points[i].y);
        }
        this.wetSandGraphics.lineTo(0, this.bottomY);
        this.wetSandGraphics.closePath();
        this.wetSandGraphics.fillPath();

        this.waterGraphics.clear();
        this.waterGraphics.fillGradientStyle(0x0a2d42, 0x0a2d42, 0x11465e, 0x11465e, 0.94, 0.94, 0.96, 0.96);
        this.waterGraphics.beginPath();
        this.waterGraphics.moveTo(0, this.topY);
        for (let i = 0; i < points.length; i++) {
            this.waterGraphics.lineTo(points[i].x, points[i].y);
        }
        this.waterGraphics.lineTo(0, this.bottomY);
        this.waterGraphics.closePath();
        this.waterGraphics.fillPath();

        this.waterGraphics.fillStyle(0x3598b8, 0.28);
        this.waterGraphics.beginPath();
        this.waterGraphics.moveTo(0, this.topY);
        for (let i = 0; i < points.length; i++) {
            const shallowInset = Math.max(0, points[i].x - (18 + Math.sin(points[i].y * 0.03) * 6));
            this.waterGraphics.lineTo(shallowInset, points[i].y);
        }
        for (let i = points.length - 1; i >= 0; i--) {
            this.waterGraphics.lineTo(points[i].x, points[i].y);
        }
        this.waterGraphics.closePath();
        this.waterGraphics.fillPath();

        this.foamGraphics.clear();

        this.foamGraphics.lineStyle(6, 0x7fe4f0, 0.35);
        this.foamGraphics.beginPath();
        this.foamGraphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.foamGraphics.lineTo(points[i].x, points[i].y);
        }
        this.foamGraphics.strokePath();

        this.foamGraphics.lineStyle(3, 0xffffff, 0.88);
        this.foamGraphics.beginPath();
        this.foamGraphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.foamGraphics.lineTo(points[i].x, points[i].y);
        }
        this.foamGraphics.strokePath();

        this.foamGraphics.fillStyle(0xffffff, 0.7);
        for (let i = 0; i < points.length; i += 2) {
            const p = points[i];
            const bob = Math.sin(t * 0.003 + i) * 3;
            const r = 2.5 + Math.sin(t * 0.004 + i * 2) * 1.5;
            this.foamGraphics.fillCircle(p.x + bob, p.y, r);
        }

        const midY = (this.topY + this.bottomY) / 2;
        this.foamEmitter.setPosition(this.getWaterX(midY), 0);

        return this.currentX;
    }

    setSpeed(speed) {
        this.currentSpeed = speed;
    }

    triggerKingTide() {
        this.isKingTide = true;
        this.currentSpeed = this.baseSpeed * 2;

        this.scene.cameras.main.shake(500, 0.01);

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
        this.elapsed = 0;

        if (this.wetSandGraphics) this.wetSandGraphics.clear();
        if (this.waterGraphics) this.waterGraphics.clear();
        if (this.foamGraphics) this.foamGraphics.clear();
    }
}
