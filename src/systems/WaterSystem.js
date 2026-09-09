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

        // Spray flung off the crest as the wave breaks
        this.foamEmitter = scene.add.particles(startX, 0, 'seed', {
            y: { min: this.topY, max: this.bottomY },
            speedX: { min: 6, max: 26 },
            speedY: { min: -14, max: 14 },
            lifespan: 1800,
            quantity: 1,
            frequency: 90,
            scale: { start: 0.42, end: 0 },
            alpha: { start: 0.7, end: 0 },
            tint: 0xffffff,
        }).setDepth(7);
    }

    /** Surf-beat surge: asymmetric cycle — quick push up the beach,
     *  slow drain back, like real swash. Range -8..+8. */
    getSurge(t) {
        const cycle = Math.sin(t * 0.0017) * 0.5 + 0.5;
        return Math.pow(cycle, 1.7) * 16 - 8;
    }

    getWaveOffset(y, t) {
        // Long swells traveling along the shore
        const swell1 = Math.sin(y * 0.014 + t * 0.0021) * 12;
        const swell2 = Math.cos(y * 0.036 - t * 0.003) * 6.5;
        // Wind chop riding on top of the swells
        const chop = Math.sin(y * 0.085 + t * 0.0052) * 2.5;
        // Traveling breaker bulge running down the shoreline
        const breaker = Math.sin(y * 0.0075 - t * 0.0016) * 9;
        return swell1 + swell2 + chop + breaker + this.getSurge(t);
    }

    /** 0..1 — how hard the wave is breaking at this point of the edge.
     *  Drives foam thickness, bubbles and spray. */
    getFoamIntensity(y, t) {
        const crest = Math.max(0, Math.sin(y * 0.0075 - t * 0.0016));
        const local = Math.sin(y * 0.045 + t * 0.0038) * 0.5 + 0.5;
        return Math.min(1, crest * 0.65 + local * 0.35);
    }

    getWaterX(y) {
        const t = this.elapsed;
        const offset = y !== undefined ? this.getWaveOffset(y, t) : this.getSurge(t);
        return this.currentX + offset;
    }

    update(delta) {
        this.elapsed += delta;

        const movement = this.currentSpeed * (delta / 1000);
        this.currentX += movement;

        const step = 12;
        const points = [];
        for (let y = this.topY; y <= this.bottomY + step; y += step) {
            const clampedY = Math.min(y, this.bottomY);
            points.push({
                x: this.getWaterX(clampedY),
                y: clampedY,
                foam: this.getFoamIntensity(clampedY, this.elapsed),
            });
        }

        const t = this.elapsed;

        // ── Wet sand: dark sheen reaching ahead of the waterline where
        //    the last swash ran up the beach ──
        this.wetSandGraphics.clear();
        this.wetSandGraphics.fillStyle(0x1d1a12, 0.46);
        this.wetSandGraphics.beginPath();
        this.wetSandGraphics.moveTo(0, this.topY);
        for (let i = 0; i < points.length; i++) {
            const surgeLead = 16 + Math.sin(points[i].y * 0.02 + t * 0.0015) * 7;
            this.wetSandGraphics.lineTo(points[i].x + surgeLead, points[i].y);
        }
        this.wetSandGraphics.lineTo(0, this.bottomY);
        this.wetSandGraphics.closePath();
        this.wetSandGraphics.fillPath();

        // ── Water body: deep gradient base ──
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

        // ── Shallow luminous band where light catches the thin water ──
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

        // ── Brighter glassy strip right at the edge ──
        this.waterGraphics.fillStyle(0x7fd4e8, 0.22);
        this.waterGraphics.beginPath();
        this.waterGraphics.moveTo(0, this.topY);
        for (let i = 0; i < points.length; i++) {
            const edgeInset = Math.max(0, points[i].x - (8 + Math.sin(points[i].y * 0.05 + t * 0.002) * 3));
            this.waterGraphics.lineTo(edgeInset, points[i].y);
        }
        for (let i = points.length - 1; i >= 0; i--) {
            this.waterGraphics.lineTo(points[i].x, points[i].y);
        }
        this.waterGraphics.closePath();
        this.waterGraphics.fillPath();

        // ── Internal current streaks drifting inside the water body ──
        for (let s = 0; s < 3; s++) {
            const drift = Math.sin(t * 0.0011 + s * 2.4) * 8;
            const inset = 30 + s * 34 + drift;
            this.waterGraphics.lineStyle(2, 0x9fd8e8, 0.12 - s * 0.03);
            this.waterGraphics.beginPath();
            let started = false;
            for (let i = 0; i < points.length; i++) {
                const sx = points[i].x - inset;
                if (sx <= 2) {
                    started = false;
                    continue;
                }
                if (!started) {
                    this.waterGraphics.moveTo(sx, points[i].y);
                    started = true;
                } else {
                    this.waterGraphics.lineTo(sx, points[i].y);
                }
            }
            this.waterGraphics.strokePath();
        }

        this.foamGraphics.clear();

        // ── Soft aqua glow hugging the crest ──
        this.foamGraphics.lineStyle(10, 0x7fe4f0, 0.16);
        this.foamGraphics.beginPath();
        this.foamGraphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.foamGraphics.lineTo(points[i].x, points[i].y);
        }
        this.foamGraphics.strokePath();

        // ── Crest: thickness & opacity follow the breaker intensity,
        //    so the foam swells where the wave is actually breaking ──
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            this.foamGraphics.lineStyle(1.5 + p0.foam * 4.5, 0xffffff, 0.45 + p0.foam * 0.5);
            this.foamGraphics.beginPath();
            this.foamGraphics.moveTo(p0.x, p0.y);
            this.foamGraphics.lineTo(p1.x, p1.y);
            this.foamGraphics.strokePath();
        }

        // ── Trailing foam flecks left behind the receding edge ──
        this.foamGraphics.fillStyle(0xffffff, 0.28);
        for (let i = 0; i < points.length; i += 2) {
            const p = points[i];
            const hash = Math.sin(i * 12.9898) * 43758.5453;
            const frac = hash - Math.floor(hash);
            const driftBack = 8 + frac * 30 + Math.sin(t * 0.002 + i) * 4;
            this.foamGraphics.fillCircle(p.x - driftBack, p.y, 1 + frac * 2);
        }

        // ── Crest bubbles, swelling where the wave breaks ──
        this.foamGraphics.fillStyle(0xffffff, 0.7);
        for (let i = 0; i < points.length; i += 2) {
            const p = points[i];
            const bob = Math.sin(t * 0.003 + i) * 3;
            const r = (1.5 + p.foam * 3) + Math.sin(t * 0.004 + i * 2) * 1.2;
            this.foamGraphics.fillCircle(p.x + bob, p.y, Math.max(0.5, r));
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
                fontSize: '64px',
                fontStyle: 'bold',
                color: '#ff6b6b',
                stroke: '#000000',
                strokeThickness: 7,
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
