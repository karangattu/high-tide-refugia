import * as Phaser from 'phaser';
import { triggerFullscreenAndOrientation } from '../utils/mobile.js';

const TEXT_RES = window.devicePixelRatio || 2;

const AMBER = 0xf39c12;
const AMBER_STR = '#f39c12';
const TEAL_STR = '#9fd8e8';
const TEAL_LIGHT = 0x7fd4e8;
const INK = 0x0c1a0c;

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const { width, height } = this.scale;

        this.compact = height <= 520 || width < 700;
        this.portrait = height > width;
        this.horizonY = height * (this.portrait ? 0.34 : 0.40);
        this.marshY = height * (this.portrait ? 0.52 : 0.56);

        this.createBackground(width, height);
        this.createMarshDetail(width, height);
        this.startRailRunner(width, height);
        this.createParticles(width, height);
        this.createTitle(width, height);
        this.createButtons(width, height);
        this.createFooter(width, height);

        this.cameras.main.fadeIn(600);
    }

    // ─── BACKGROUND ──────────────────────────────────────────────

    createBackground(width, height) {
        const { horizonY, marshY } = this;

        const sky = this.add.graphics().setDepth(-30);
        sky.fillGradientStyle(0x1976d2, 0x1976d2, 0xffd54f, 0xffd54f, 1, 1, 1, 1);
        sky.fillRect(0, 0, width, horizonY + 2);

        const sunX = width * 0.72;
        const sunY = horizonY * 0.46;
        const sun = this.add.graphics().setDepth(-29);
        sun.setBlendMode(Phaser.BlendModes.ADD);
        sun.fillStyle(0xffa726, 0.20);
        sun.fillCircle(sunX, sunY, horizonY * 0.48);
        sun.fillStyle(0xffca28, 0.42);
        sun.fillCircle(sunX, sunY, horizonY * 0.28);
        sun.fillStyle(0xfff59d, 0.85);
        sun.fillCircle(sunX, sunY, horizonY * 0.15);
        sun.fillStyle(0xffffff, 0.98);
        sun.fillCircle(sunX, sunY, horizonY * 0.08);

        sun.lineStyle(2, 0xffeb3b, 0.35);
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const r1 = horizonY * 0.18;
            const r2 = horizonY * 0.44;
            sun.beginPath();
            sun.moveTo(sunX + Math.cos(angle) * r1, sunY + Math.sin(angle) * r1);
            sun.lineTo(sunX + Math.cos(angle) * r2, sunY + Math.sin(angle) * r2);
            sun.strokePath();
        }

        const water = this.add.graphics().setDepth(-29);
        water.fillGradientStyle(0x1565c0, 0x1565c0, 0x00838f, 0x00838f, 1, 1, 1, 1);
        water.fillRect(0, horizonY, width, marshY - horizonY + 2);

        const refl = this.add.graphics().setDepth(-28);
        refl.setBlendMode(Phaser.BlendModes.ADD);
        for (let i = 0; i < 8; i++) {
            const t = i / 7;
            const y = horizonY + 6 + t * (marshY - horizonY - 12);
            const w = (1 - t) * 140 + 28;
            refl.fillStyle(0xffe082, 0.32 * (1 - t) + 0.08);
            refl.fillEllipse(
                sunX + Phaser.Math.Between(-12, 12), y,
                w, Phaser.Math.Between(2, 4)
            );
        }

        // Shimmer lines across the water (twinkle via tweens)
        for (let i = 0; i < 14; i++) {
            const y = Phaser.Math.Between(horizonY + 8, marshY - 8);
            const line = this.add.rectangle(
                Phaser.Math.Between(0, width), y,
                Phaser.Math.Between(24, 90), 2,
                0x9fd8e8, Phaser.Math.FloatBetween(0.10, 0.28)
            ).setDepth(-28);
            this.tweens.add({
                targets: line,
                alpha: { from: line.alpha, to: 0.02 },
                duration: Phaser.Math.Between(1200, 2600),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000),
            });
        }

        // Marsh: mud waterline shading into upland green
        const marsh = this.add.graphics().setDepth(-27);
        marsh.fillStyle(0x5d4e37, 1);
        marsh.fillRect(0, marshY, width, 30);
        marsh.fillGradientStyle(0x4a5d33, 0x4a5d33, 0x22331b, 0x22331b, 1, 1, 1, 1);
        marsh.fillRect(0, marshY + 24, width, height - marshY - 24);

        // Waterline foam
        const foam = this.add.graphics().setDepth(-26);
        foam.lineStyle(2, 0xffffff, 0.28);
        foam.beginPath();
        foam.moveTo(0, marshY + 2);
        for (let x = 0; x <= width; x += 24) {
            foam.lineTo(x, marshY + 2 + Math.sin(x * 0.045) * 2.2);
        }
        foam.strokePath();

        // Vignette to seat the composition
        const vignette = this.add.graphics().setDepth(5);
        vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.45, 0.45, 0, 0);
        vignette.fillRect(0, 0, width, height * 0.10);
        vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.4, 0.4);
        vignette.fillRect(0, height * 0.92, width, height * 0.08);
    }

    createMarshDetail(width, height) {
        const { marshY } = this;

        // Perspective reed clusters (taller toward the foreground)
        const reeds = this.add.graphics().setDepth(-25);
        const clusters = Math.round(width / 130);
        for (let i = 0; i < clusters; i++) {
            const x = Phaser.Math.Between(10, width - 10);
            const depth = Phaser.Math.FloatBetween(0.15, 1);
            const y = marshY + 30 + depth * (height - marshY - 55);
            const h = 12 + depth * 30;
            const blades = Phaser.Math.Between(4, 6);
            for (let b = 0; b < blades; b++) {
                const bx = x + (b - blades / 2) * (5 + depth * 4);
                const lean = Phaser.Math.Between(-8, 8);
                // Quadratic bezier sampled by hand (Graphics has no quadraticCurveTo)
                const p0x = bx, p0y = y;
                const p1x = bx + lean * 0.4, p1y = y - h * 0.6;
                const p2x = bx + lean, p2y = y - h;
                reeds.lineStyle(1.5 + depth, 0x1e3d1a, 0.85);
                reeds.beginPath();
                reeds.moveTo(p0x, p0y);
                for (let s = 1; s <= 6; s++) {
                    const t = s / 6;
                    const mt = 1 - t;
                    reeds.lineTo(
                        mt * mt * p0x + 2 * mt * t * p1x + t * t * p2x,
                        mt * mt * p0y + 2 * mt * t * p1y + t * t * p2y
                    );
                }
                reeds.strokePath();
            }
        }

        const cordgrassClumps = Math.max(2, Math.round(width / 450));
        for (let i = 0; i < cordgrassClumps; i++) {
            const x = Phaser.Math.Between(20, Math.min(width * 0.18, 120));
            const y = marshY + Phaser.Math.Between(24, 60);
            this.add.image(x, y, 'cordgrass')
                .setScale(Phaser.Math.FloatBetween(0.18, 0.26))
                .setAlpha(0.85)
                .setDepth(-20);
        }

        const gumplantClumps = Math.max(2, Math.round(width / 450));
        for (let i = 0; i < gumplantClumps; i++) {
            const x = Phaser.Math.Between(Math.max(width * 0.82, width - 140), width - 30);
            const y = marshY + Phaser.Math.Between(24, 60);
            this.add.image(x, y, 'gumplant')
                .setScale(Phaser.Math.FloatBetween(0.18, 0.28))
                .setAlpha(0.92)
                .setDepth(-20);
        }

        // Safe-zone hint on the right (upland glow, mirrors the game)
        this.add.rectangle(width - 40, height / 2, 80, height, 0x27ae60, 0.10)
            .setDepth(-24);
    }

    // ─── RAIL RUNNERS ────────────────────────────────────────────

    startRailRunner(width, height) {
        const groundY = this.marshY + (height - this.marshY) * 0.30;
        const scale = this.compact ? 0.11 : 0.13;

        const makeRunner = (startDelay, yOff, scl, duration) => {
            const rail = this.add.sprite(-140, groundY + yOff, 'rail_running_1')
                .setScale(scl)
                .setDepth(-10);
            const run = () => {
                rail.stop();
                rail.setX(-140).setY(groundY + yOff).setAlpha(1);
                this.tweens.add({
                    targets: rail,
                    x: width + 140,
                    duration,
                    ease: 'Linear',
                    onComplete: () => {
                        this.time.delayedCall(Phaser.Math.Between(1200, 2600), run);
                    },
                });
            };
            this.time.delayedCall(startDelay, run);
            return rail;
        };

        this.runnerA = makeRunner(600, 0, scale, Phaser.Math.Between(8500, 9500));
        this.runnerB = makeRunner(3200, -14, scale * 0.85, Phaser.Math.Between(7500, 8200));

        // Shared frame cycler (ground-anchored slices keep feet steady)
        this.railTick = 0;
        this.time.addEvent({
            delay: 130,
            loop: true,
            callback: () => {
                this.railTick = (this.railTick + 1) % 4;
                if (this.runnerA) this.runnerA.setTexture(`rail_running_${this.railTick + 1}`);
                if (this.runnerB) this.runnerB.setTexture(`rail_running_${((this.railTick + 2) % 4) + 1}`);
            },
        });
    }

    // ─── PARTICLES ───────────────────────────────────────────────

    createParticles(width, _height) {
        // Drifting seeds across the whole scene
        this.add.particles(0, 0, 'seed', {
            x: { min: 0, max: width },
            y: { min: -20, max: -10 },
            lifespan: 9000,
            speedY: { min: 15, max: 35 },
            speedX: { min: -15, max: 15 },
            scale: { start: 0.5, end: 0.3 },
            alpha: { start: 0.7, end: 0 },
            rotate: { min: 0, max: 360 },
            frequency: 600,
            blendMode: Phaser.BlendModes.ADD,
        }).setDepth(-15);

        // Water glints on the flood side
        this.add.particles(0, 0, 'seed', {
            x: { min: 0, max: width * 0.5 },
            y: { min: this.horizonY, max: this.marshY },
            lifespan: 2500,
            speedY: { min: -8, max: 8 },
            speedX: { min: 5, max: 14 },
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.25, end: 0 },
            tint: TEAL_LIGHT,
            frequency: 220,
        }).setDepth(-28);
    }

    // ─── TITLE ───────────────────────────────────────────────────

    createTitle(width, height) {
        const compact = this.compact;
        const veryShort = height <= 420;
        const titleY = height * (veryShort ? 0.13 : (compact ? 0.15 : 0.16));
        const titleSize = veryShort ? '42px' : (compact ? '56px' : (this.portrait ? '84px' : '100px'));
        const subSize = veryShort ? '14px' : (compact ? '20px' : '26px');
        const eyebrowSize = veryShort ? '11px' : (compact ? '14px' : '18px');

        this.add.text(width / 2, titleY - (compact ? 38 : 60),
            'A  M A R S H  C O N S E R V A T I O N  G A M E', {
            fontFamily: 'Outfit',
            fontSize: eyebrowSize,
            color: '#9fd8e8',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setAlpha(0.85);

        const titleGlow = this.add.text(width / 2, titleY, 'RAIL REFUGE', {
            fontFamily: 'Outfit',
            fontSize: titleSize,
            fontStyle: '900',
            color: AMBER_STR,
            resolution: TEXT_RES,
        }).setOrigin(0.5).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);

        this.add.text(width / 2, titleY, 'RAIL REFUGE', {
            fontFamily: 'Outfit',
            fontSize: titleSize,
            fontStyle: '900',
            color: AMBER_STR,
            resolution: TEXT_RES,
        }).setOrigin(0.5).setShadow(0, 4, 'rgba(0,0,0,0.45)', 14, false, true);

        this.tweens.add({
            targets: titleGlow,
            scaleX: 1.04,
            scaleY: 1.04,
            alpha: 0.5,
            duration: 2200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Divider with centre diamond
        const divY = titleY + (compact ? 42 : 58);
        const divider = this.add.graphics();
        divider.lineStyle(1, 0xffffff, 0.35);
        divider.beginPath();
        divider.moveTo(width / 2 - (compact ? 90 : 130), divY);
        divider.lineTo(width / 2 - 14, divY);
        divider.moveTo(width / 2 + 14, divY);
        divider.lineTo(width / 2 + (compact ? 90 : 130), divY);
        divider.strokePath();
        divider.fillStyle(AMBER, 1);
        divider.fillTriangle(
            width / 2, divY - 5,
            width / 2 - 5, divY,
            width / 2, divY + 5
        );
        divider.fillTriangle(
            width / 2, divY - 5,
            width / 2 + 5, divY,
            width / 2, divY + 5
        );

        const subtitle = this.add.text(width / 2, divY + (compact ? 28 : 38), 'H I G H  T I D E  R I S I N G', {
            fontFamily: 'Outfit',
            fontSize: subSize,
            color: '#bfe8f2',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: subtitle,
            alpha: 1,
            duration: 900,
            delay: 400,
            ease: 'Power2',
        });
    }

    // ─── BUTTONS ─────────────────────────────────────────────────

    createButtonTextures() {
        const { compact } = this;
        const veryShort = this.scale.height <= 420;
        this.btnW = compact ? (veryShort ? 270 : 330) : 390;
        this.btnPrimaryH = compact ? (veryShort ? 54 : 76) : 96;
        this.btnSecondaryH = compact ? (veryShort ? 44 : 62) : 78;
        const radius = compact ? 14 : 20;

        const make = (key, w, h, primary, hover) => {
            if (this.textures.exists(key)) this.textures.remove(key);
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            if (primary) {
                g.fillStyle(hover ? 0xd8880f : 0xc8760a, 1);
                g.fillRoundedRect(0, 0, w, h, radius);
                g.fillStyle(hover ? 0xffc14d : 0xf2a62e, 1);
                g.fillRoundedRect(0, 0, w, h - 6, radius);
                g.lineStyle(2, hover ? 0xffd27a : 0xb06e10, hover ? 0.9 : 1);
                g.strokeRoundedRect(1, 1, w - 2, h - 2, radius);
                g.lineStyle(1, 0xffffff, 0.35);
                g.lineBetween(10, 5, w - 10, 5);
            } else {
                g.fillStyle(INK, hover ? 0.88 : 0.72);
                g.fillRoundedRect(0, 0, w, h, radius);
                g.lineStyle(1.5, hover ? 0x9be29b : 0x3ddc84, hover ? 0.9 : 0.5);
                g.strokeRoundedRect(1, 1, w - 2, h - 2, radius);
            }
            g.generateTexture(key, w, h);
            g.destroy();
        };

        make('menu_btn_primary', this.btnW, this.btnPrimaryH, true, false);
        make('menu_btn_primary_hover', this.btnW, this.btnPrimaryH, true, true);
        make('menu_btn_secondary', this.btnW, this.btnSecondaryH, false, false);
        make('menu_btn_secondary_hover', this.btnW, this.btnSecondaryH, false, true);
    }

    createButtons(width, height) {
        this.createButtonTextures();
        const { compact, portrait } = this;
        const veryShort = height <= 420;

        const spacing = veryShort ? 10 : (compact ? 16 : 22);
        const totalStack = this.btnPrimaryH + 2 * this.btnSecondaryH + 2 * spacing;
        const footerReserve = compact ? 50 : 92;
        const startY = Math.min(
            height * (compact ? 0.40 : (portrait ? 0.52 : 0.48)),
            height - footerReserve - totalStack
        );

        const primaryY = startY + this.btnPrimaryH / 2;
        this.createButton(width / 2, primaryY, 'PLAY', 'menu_btn_primary', veryShort ? '26px' : '36px', '#2b1c07', () => {
            this.cameras.main.fadeOut(500);
            this.time.delayedCall(500, () => this.scene.start('IntroScene'));
        });

        let y = primaryY + this.btnPrimaryH / 2 + spacing;
        this.createButton(width / 2, y + this.btnSecondaryH / 2, 'HOW TO PLAY', 'menu_btn_secondary',
            veryShort ? '16px' : (compact ? '21px' : '26px'), '#eef7f2', () => this.showTutorial());
        y += this.btnSecondaryH + spacing;
        this.createButton(width / 2, y + this.btnSecondaryH / 2, 'SFBBO & VOLUNTEER', 'menu_btn_secondary',
            veryShort ? '14px' : (compact ? '18px' : '22px'), '#eef7f2', () => this.showSFBBOInfo());

        this.stackBottom = y + this.btnSecondaryH;
    }

    createButton(x, y, label, texture, fontSize, color, callback) {
        const btn = this.add.image(x, y, texture)
            .setInteractive({ useHandCursor: true })
            .setDepth(10);

        const text = this.add.text(x, y, label, {
            fontFamily: 'Outfit',
            fontSize,
            fontStyle: 'bold',
            color,
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(11);

        const hoverTex = texture.replace('primary', 'primary_hover').replace('secondary', 'secondary_hover');
        const baseTex = texture;

        btn.on('pointerover', () => {
            btn.setTexture(hoverTex);
            this.tweens.add({ targets: [btn, text], scaleX: 1.04, scaleY: 1.04, duration: 100 });
        });

        btn.on('pointerout', () => {
            btn.setTexture(baseTex);
            this.tweens.add({ targets: [btn, text], scaleX: 1, scaleY: 1, duration: 100 });
        });

        btn.on('pointerdown', () => {
            if (label === 'PLAY') {
                triggerFullscreenAndOrientation();
            }
            this.tweens.add({
                targets: [btn, text],
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 60,
                yoyo: true,
                onComplete: callback,
            });
        });

        return { btn, text };
    }

    createFooter(width, height) {
        const compact = this.compact;
        // Keep clear of the button stack on short viewports
        const lineGap = compact ? 18 : 26;
        const footerY = Math.min(
            Math.max(this.stackBottom + (compact ? 24 : 36), height - (compact ? 42 : 64)),
            height - lineGap - (compact ? 10 : 14)
        );
        this.add.text(width / 2, footerY,
            "Help endangered Ridgway's Rails cross the marsh before the tide rises", {
            fontFamily: 'Outfit',
            fontSize: compact ? '14px' : '19px',
            color: '#ffffff',
            resolution: TEXT_RES,
            alpha: 0.65,
        }).setOrigin(0.5).setDepth(6);

        const sfbboFooter = this.add.text(width / 2, footerY + lineGap,
            'A project with the San Francisco Bay Bird Observatory  •  sfbbo.org', {
            fontFamily: 'Outfit',
            fontSize: compact ? '13px' : '17px',
            color: TEAL_STR,
            resolution: TEXT_RES,
            alpha: 0.7,
        }).setOrigin(0.5).setDepth(6).setInteractive({ useHandCursor: true });

        sfbboFooter.on('pointerdown', () => this.showSFBBOInfo());
        sfbboFooter.on('pointerover', () => sfbboFooter.setColor('#ffffff'));
        sfbboFooter.on('pointerout', () => sfbboFooter.setColor(TEAL_STR));
    }

    // ─── MODALS ──────────────────────────────────────────────────

    buildModalShell(width, height, title) {
        const compact = this.compact;
        const panelW = Math.min(compact ? 560 : 820, width - 30);
        const panelH = Math.min(compact ? 430 : 660, height - 40);
        const left = width / 2 - panelW / 2;
        const top = height / 2 - panelH / 2;

        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.82)
            .setDepth(90)
            .setInteractive();

        const panel = this.add.graphics().setDepth(91);
        panel.fillStyle(0x10241c, 0.96);
        panel.fillRoundedRect(left, top, panelW, panelH, 20);
        panel.lineStyle(1.5, AMBER, 0.5);
        panel.strokeRoundedRect(left, top, panelW, panelH, 20);

        const titleText = this.add.text(width / 2, top + (compact ? (title.length > 18 ? 34 : 42) : 54), title, {
            fontFamily: 'Outfit',
            fontSize: compact ? (title.length > 18 ? '21px' : '28px') : (title.length > 18 ? '32px' : '40px'),
            fontStyle: '900',
            color: AMBER_STR,
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(92);

        return { overlay, panel, titleText, panelW, panelH, left, top, compact };
    }

    buildModalClose(shell, onClose) {
        const { left, top, panelW, panelH, compact } = shell;
        const bw = compact ? (panelH < 390 ? 170 : 200) : 250;
        const bh = compact ? (panelH < 390 ? 38 : 48) : 62;
        const cx = left + panelW / 2;
        const cy = top + panelH - bh / 2 - (compact ? 16 : 24);

        if (this.textures.exists('modal_close_btn')) this.textures.remove('modal_close_btn');
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(INK, 0.9);
        g.fillRoundedRect(0, 0, bw, bh, bh / 2);
        g.lineStyle(1.5, 0x3ddc84, 0.7);
        g.strokeRoundedRect(1, 1, bw - 2, bh - 2, bh / 2);
        g.generateTexture('modal_close_btn', bw, bh);
        g.destroy();

        const btn = this.add.image(cx, cy, 'modal_close_btn')
            .setDepth(93)
            .setInteractive({ useHandCursor: true });
        const label = this.add.text(cx, cy, 'GOT IT', {
            fontFamily: 'Outfit',
            fontSize: compact ? (panelH < 390 ? '16px' : '20px') : '26px',
            fontStyle: 'bold',
            color: '#9be29b',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(94);

        const destroyModal = () => {
            [shell.overlay, shell.panel, shell.titleText, btn, label,
                ...(shell.items || [])].forEach(o => o && o.destroy());
            if (onClose) onClose();
        };

        btn.on('pointerover', () => this.tweens.add({ targets: [btn, label], scaleX: 1.05, scaleY: 1.05, duration: 100 }));
        btn.on('pointerout', () => this.tweens.add({ targets: [btn, label], scaleX: 1, scaleY: 1, duration: 100 }));
        btn.on('pointerdown', destroyModal);
        shell.overlay.on('pointerdown', destroyModal);

        return destroyModal;
    }

    createModalLinkButton(x, y, w, h, label, url, strokeColor, fillColor) {
        const bg = this.add.graphics().setDepth(93);
        const radius = Math.min(h / 2, 10);
        const draw = (hover) => {
            bg.clear();
            bg.fillStyle(hover ? 0x274a36 : fillColor, 0.95);
            bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
            bg.lineStyle(1.5, hover ? 0xffffff : strokeColor, hover ? 1 : 0.85);
            bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
        };
        draw(false);

        const txt = this.add.text(x, y, label, {
            fontFamily: 'Outfit',
            fontSize: this.compact ? '12px' : '15px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(94);

        const hit = this.add.rectangle(x, y, w, h, 0xffffff, 0)
            .setInteractive({ useHandCursor: true })
            .setDepth(95);

        hit.on('pointerover', () => {
            draw(true);
            this.tweens.add({ targets: txt, scaleX: 1.04, scaleY: 1.04, duration: 80 });
        });
        hit.on('pointerout', () => {
            draw(false);
            this.tweens.add({ targets: txt, scaleX: 1, scaleY: 1, duration: 80 });
        });
        hit.on('pointerdown', () => {
            if (typeof window !== 'undefined') {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        });

        return [bg, txt, hit];
    }

    showTutorial() {
        const { width, height } = this.scale;
        const shell = this.buildModalShell(width, height, 'HOW TO PLAY');
        const { panelW, left, top, compact } = shell;

        const instructions = [
            { icon: 'icon_wave', text: 'The tide is rising! Rails flee from left to right.' },
            { icon: 'icon_leaf', text: 'TAP the marsh to plant vegetation and create hiding spots.' },
            { icon: 'icon_paw', text: 'Cats and harriers hunt exposed Rails.' },
            { icon: 'icon_bolt', text: 'Rails in plants become invisible to predators.' },
            { icon: 'icon_trophy', text: 'Bonus points for "Continuous Cover" paths!' },
            { icon: 'icon_heart_green', text: 'Save as many Rails as you can before the tide rises!' },
        ];

        const itemSpacing = compact ? 52 : 66;
        const startY = top + (compact ? 96 : 128);
        const iconX = left + (compact ? 42 : 64);
        const textX = iconX + (compact ? 28 : 34);

        shell.items = [];
        instructions.forEach((item, i) => {
            const y = startY + i * itemSpacing;
            const ico = this.add.image(iconX, y, item.icon)
                .setScale(compact ? 1.1 : 1.5).setDepth(92);
            const txt = this.add.text(textX, y, item.text, {
                fontFamily: 'Outfit',
                fontSize: compact ? '18px' : '24px',
                color: '#ffffff',
                resolution: TEXT_RES,
                wordWrap: { width: panelW - (compact ? 100 : 140) },
            }).setOrigin(0, 0.5).setDepth(92);
            shell.items.push(ico, txt);
        });

        this.buildModalClose(shell);
    }

    showSFBBOInfo() {
        const { width, height } = this.scale;
        const shell = this.buildModalShell(width, height, 'SFBBO TIDAL MARSH PROGRAM');
        const { left, top, panelW, compact } = shell;

        shell.items = [];

        const titleY = top + (compact ? 32 : 48);
        shell.titleText.setY(titleY);

        const sub = this.add.text(width / 2, titleY + (compact ? 22 : 32), 'San Francisco Bay Bird Observatory', {
            fontFamily: 'Outfit',
            fontSize: compact ? '12px' : '16px',
            fontStyle: 'bold',
            color: TEAL_STR,
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(92);
        shell.items.push(sub);

        const contentW = panelW - (compact ? 40 : 72);
        const textStartY = titleY + (compact ? 42 : 62);

        const missionText = "Over 90% of SF Bay's historic tidal wetlands have been lost or degraded. SFBBO's Tidal Marsh Program researches and restores vital transition zones—the ecotones between marsh plains and uplands.\n\nBy planting native species like Gumplant, Cordgrass, and Saltgrass, SFBBO builds high-tide refugia: life-saving escape cover where endangered Ridgway's Rails and salt marsh harvest mice find food, shelter, and safety during extreme king tides.";

        const p1 = this.add.text(left + panelW / 2, textStartY, missionText, {
            fontFamily: 'Outfit',
            fontSize: compact ? '12px' : '15.5px',
            color: '#eef7f2',
            resolution: TEXT_RES,
            align: 'center',
            lineSpacing: compact ? 2.5 : 5,
            wordWrap: { width: contentW },
        }).setOrigin(0.5, 0).setDepth(92);
        shell.items.push(p1);

        const volunteerStartY = textStartY + p1.height + (compact ? 8 : 14);
        const volunteerText = "Want to get involved? Volunteers propagate native plants in nurseries, restore marsh habitat corridors, remove invasive weeds, and support bird conservation!";

        const p2 = this.add.text(left + panelW / 2, volunteerStartY, volunteerText, {
            fontFamily: 'Outfit',
            fontSize: compact ? '12px' : '15px',
            fontStyle: 'bold',
            color: '#ffd166',
            resolution: TEXT_RES,
            align: 'center',
            lineSpacing: compact ? 2 : 4,
            wordWrap: { width: contentW },
        }).setOrigin(0.5, 0).setDepth(92);
        shell.items.push(p2);

        const btnY = volunteerStartY + p2.height + (compact ? 16 : 24);
        const btnW = compact ? Math.min(240, (contentW - 12) / 2) : 310;
        const btnH = compact ? 36 : 46;
        const btnSpread = compact ? btnW / 2 + 6 : btnW / 2 + 14;

        const link1 = this.createModalLinkButton(
            width / 2 - btnSpread,
            btnY,
            btnW,
            btnH,
            '🌿 sfbbo.org/tidalmarsh',
            'https://www.sfbbo.org/tidalmarsh/',
            0xf39c12,
            0x1c2b1e
        );
        shell.items.push(...link1);

        const link2 = this.createModalLinkButton(
            width / 2 + btnSpread,
            btnY,
            btnW,
            btnH,
            '🌱 sfbbo.org/volunteer',
            'https://www.sfbbo.org/volunteer/',
            0x2ecc71,
            0x143322
        );
        shell.items.push(...link2);

        this.buildModalClose(shell);
    }
}
