import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Get loading bar element
        const loadingBar = document.getElementById('loading-bar');

        // Update loading bar as assets load
        this.load.on('progress', (value) => {
            if (loadingBar) {
                loadingBar.style.width = `${value * 100}%`;
            }
        });

        this.load.on('complete', () => {
            // Hide loading screen with fade
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }
        });

        // Load real Rail sprite images
        this.load.image('rail_running_1', 'assets/sprites/rail_running_1.png');
        this.load.image('rail_running_2', 'assets/sprites/rail_running_2.png');
        this.load.image('rail_running_3', 'assets/sprites/rail_running_3.png');
        this.load.image('rail_running_4', 'assets/sprites/rail_running_4.png');
        this.load.image('rail_hiding', 'assets/sprites/rail_hiding.png');
        this.load.image('rail_standing', 'assets/sprites/rail_standing.png');
        this.load.image('rail_surprised', 'assets/sprites/rail_surprised.png');
        this.load.image('rail_calling', 'assets/sprites/rail_making_a_call.png');

        // Load real Fox sprite images
        this.load.image('fox_walking_1', 'assets/sprites/fox_walking_1.png');
        this.load.image('fox_walking_2', 'assets/sprites/fox_walking_2.png');
        this.load.image('fox_walking_3', 'assets/sprites/fox_walking_3.png');
        this.load.image('fox_walking_4', 'assets/sprites/fox_walking_4.png');
        this.load.image('fox_pouncing', 'assets/sprites/fox_pouncing_1.png');
        this.load.image('fox_with_kill', 'assets/sprites/fox_standing_with_kill.png');

        // Load Gumweed (Grindelia stricta) SVG for gumplant / legacy plant key
        this.load.svg('gumplant', 'assets/grindelia_stricta.svg', { width: 48, height: 48 });
        this.load.svg('plant', 'assets/grindelia_stricta.svg', { width: 48, height: 48 });

        // Create placeholder graphics for other assets
        this.createPlaceholderAssets();
    }

    createPlaceholderAssets() {

        // ── PLANT VARIETIES ──────────────────────────────────────
        this.createSaltgrassTexture();
        this.createPickleweedTexture();
        this.createCordgrassTexture();
        this.createJaumeaTexture();
        // Gumplant / legacy 'plant' keys are loaded from SVG in preload()

        // Fox sprite (48x32)
        const foxGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        foxGraphics.fillStyle(0xd2691e);
        foxGraphics.fillEllipse(24, 20, 40, 20); // Body
        foxGraphics.fillStyle(0xff8c00);
        foxGraphics.fillCircle(40, 14, 10); // Head
        foxGraphics.fillTriangle(40, 4, 48, 12, 44, 4); // Ear 1
        foxGraphics.fillTriangle(36, 4, 44, 12, 40, 4); // Ear 2
        foxGraphics.fillStyle(0x000000);
        foxGraphics.fillCircle(44, 12, 2); // Eye
        foxGraphics.fillStyle(0xffffff);
        foxGraphics.fillEllipse(8, 20, 12, 6); // Tail tip
        foxGraphics.generateTexture('fox', 56, 32);
        foxGraphics.destroy();

        // ── CAT SPRITES (feral tabby) ──────────────────────────
        this.createCatTextures();

        // ── HARRIER SPRITES (Northern Harrier) ────────────────
        this.createHarrierTextures();

        // Water tile (64x64) – rich tidal water with depth gradient & wave detail
        const waterGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        // Deep base
        waterGraphics.fillGradientStyle(0x062c47, 0x062c47, 0x0e5a7e, 0x0e5a7e);
        waterGraphics.fillRect(0, 0, 64, 64);
        // Mid-depth colour band
        waterGraphics.fillStyle(0x0a4468, 0.5);
        waterGraphics.fillRect(0, 16, 64, 32);
        // Primary wave crests
        waterGraphics.lineStyle(2, 0x2498c8, 0.45);
        for (let row = 0; row < 4; row++) {
            const yBase = 8 + row * 16;
            waterGraphics.beginPath();
            waterGraphics.moveTo(0, yBase);
            for (let x = 0; x <= 64; x += 8) {
                waterGraphics.lineTo(x, yBase + Math.sin((x + row * 12) * 0.18) * 3);
            }
            waterGraphics.stroke();
        }
        // Secondary ripple lines
        waterGraphics.lineStyle(1, 0x5bbee8, 0.2);
        for (let row = 0; row < 3; row++) {
            const yBase = 14 + row * 20;
            waterGraphics.beginPath();
            waterGraphics.moveTo(0, yBase);
            for (let x = 0; x <= 64; x += 6) {
                waterGraphics.lineTo(x, yBase + Math.cos((x + row * 8) * 0.24) * 2);
            }
            waterGraphics.stroke();
        }
        // Subtle foam dots
        waterGraphics.fillStyle(0xffffff, 0.12);
        [
            [8, 6], [30, 18], [52, 10], [14, 42], [44, 50], [58, 34], [22, 58],
        ].forEach(([px, py]) => waterGraphics.fillCircle(px, py, 1.5));
        waterGraphics.generateTexture('water', 64, 64);
        waterGraphics.destroy();

        // Water-edge / shoreline overlay (16x64) for foam & wet-sand at the tide front
        const edgeGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        // Wet sand strip
        edgeGraphics.fillGradientStyle(0x3a6e9f, 0x3a6e9f, 0x5d4e37, 0x5d4e37);
        edgeGraphics.fillRect(0, 0, 16, 64);
        // Foam line
        edgeGraphics.fillStyle(0xffffff, 0.55);
        edgeGraphics.fillRect(0, 0, 4, 64);
        edgeGraphics.fillStyle(0xffffff, 0.3);
        edgeGraphics.fillRect(4, 0, 3, 64);
        // Scattered foam blobs
        edgeGraphics.fillStyle(0xffffff, 0.25);
        [6, 18, 30, 44, 56].forEach(py => {
            edgeGraphics.fillCircle(3, py, 2);
            edgeGraphics.fillCircle(7, py + 8, 1.5);
        });
        edgeGraphics.generateTexture('water_edge', 16, 64);
        edgeGraphics.destroy();

        // Mud/transition zone tile (64x64)
        const mudGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        mudGraphics.fillStyle(0x5d4e37);
        mudGraphics.fillRect(0, 0, 64, 64);
        // Texture details
        mudGraphics.fillStyle(0x4a3f2d, 0.5);
        mudGraphics.fillCircle(10, 15, 5);
        mudGraphics.fillCircle(45, 30, 7);
        mudGraphics.fillCircle(25, 50, 4);
        mudGraphics.fillCircle(55, 10, 3);
        mudGraphics.generateTexture('mud', 64, 64);
        mudGraphics.destroy();

        // Upland/grass tile (64x64)
        const grassGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        grassGraphics.fillStyle(0x4a7c23);
        grassGraphics.fillRect(0, 0, 64, 64);
        // Grass blades
        grassGraphics.fillStyle(0x5a8c33);
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * 64;
            const y = Math.random() * 64;
            grassGraphics.fillTriangle(x, y + 8, x + 3, y, x + 6, y + 8);
        }
        grassGraphics.generateTexture('grass', 64, 64);
        grassGraphics.destroy();

        // Seed particle (16x16)
        const seedGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        seedGraphics.fillStyle(0xf39c12);
        seedGraphics.fillCircle(8, 8, 4);
        seedGraphics.fillStyle(0xffffff, 0.5);
        seedGraphics.lineStyle(1, 0xffffff, 0.7);
        seedGraphics.beginPath();
        seedGraphics.moveTo(8, 4);
        seedGraphics.lineTo(8, 0);
        seedGraphics.lineTo(12, 2);
        seedGraphics.stroke();
        seedGraphics.generateTexture('seed', 16, 16);
        seedGraphics.destroy();

        // Heart particle (16x16)
        const heartGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        heartGraphics.fillStyle(0xff6b9d);
        heartGraphics.fillCircle(5, 6, 4);
        heartGraphics.fillCircle(11, 6, 4);
        heartGraphics.fillTriangle(1, 8, 8, 15, 15, 8);
        heartGraphics.generateTexture('heart', 16, 16);
        heartGraphics.destroy();

        // Dirt particle (8x8)
        const dirtGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        dirtGraphics.fillStyle(0x8b7355);
        dirtGraphics.fillCircle(4, 4, 3);
        dirtGraphics.generateTexture('dirt', 8, 8);
        dirtGraphics.destroy();

        // Button texture (200x60)
        const buttonGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        buttonGraphics.fillStyle(0x27ae60);
        buttonGraphics.fillRoundedRect(0, 0, 200, 60, 12);
        buttonGraphics.lineStyle(3, 0x2ecc71);
        buttonGraphics.strokeRoundedRect(0, 0, 200, 60, 12);
        buttonGraphics.generateTexture('button', 200, 60);
        buttonGraphics.destroy();

        // Button hover texture
        const buttonHoverGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        buttonHoverGraphics.fillStyle(0x2ecc71);
        buttonHoverGraphics.fillRoundedRect(0, 0, 200, 60, 12);
        buttonHoverGraphics.lineStyle(3, 0x58d68d);
        buttonHoverGraphics.strokeRoundedRect(0, 0, 200, 60, 12);
        buttonHoverGraphics.generateTexture('button_hover', 200, 60);
        buttonHoverGraphics.destroy();

        // ── HUD panel texture (reused for all panels) ──
        // Compact top-bar panel 220×52
        const hPnl = this.make.graphics({ x: 0, y: 0, add: false });
        hPnl.fillStyle(0x0c1a0c, 0.82);
        hPnl.fillRoundedRect(0, 0, 220, 52, 10);
        hPnl.lineStyle(1, 0x3ddc84, 0.35);
        hPnl.strokeRoundedRect(0, 0, 220, 52, 10);
        hPnl.generateTexture('hud_panel', 220, 52);
        hPnl.destroy();

        // Wide panel for seed bar 260×52
        const hPnlW = this.make.graphics({ x: 0, y: 0, add: false });
        hPnlW.fillStyle(0x0c1a0c, 0.82);
        hPnlW.fillRoundedRect(0, 0, 260, 52, 10);
        hPnlW.lineStyle(1, 0xf39c12, 0.35);
        hPnlW.strokeRoundedRect(0, 0, 260, 52, 10);
        hPnlW.generateTexture('hud_panel_wide', 260, 52);
        hPnlW.destroy();

        // Bottom stats bar full-width 480×40
        const hPnlB = this.make.graphics({ x: 0, y: 0, add: false });
        hPnlB.fillStyle(0x0c1a0c, 0.72);
        hPnlB.fillRoundedRect(0, 0, 480, 36, 8);
        hPnlB.lineStyle(1, 0xffffff, 0.15);
        hPnlB.strokeRoundedRect(0, 0, 480, 36, 8);
        hPnlB.generateTexture('hud_panel_bottom', 480, 36);
        hPnlB.destroy();

        // Legacy textures kept for menu / game-over scenes
        const seedBankGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        seedBankGraphics.fillStyle(0x000000, 0.4);
        seedBankGraphics.fillRoundedRect(0, 0, 280, 80, 16);
        seedBankGraphics.lineStyle(2, 0xffffff, 0.2);
        seedBankGraphics.strokeRoundedRect(0, 0, 280, 80, 16);
        seedBankGraphics.generateTexture('seedbank_bg', 280, 80);
        seedBankGraphics.destroy();

        const scorePanelGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        scorePanelGraphics.fillStyle(0x000000, 0.4);
        scorePanelGraphics.fillRoundedRect(0, 0, 200, 120, 16);
        scorePanelGraphics.lineStyle(2, 0xffffff, 0.2);
        scorePanelGraphics.strokeRoundedRect(0, 0, 200, 120, 16);
        scorePanelGraphics.generateTexture('score_panel', 200, 120);
        scorePanelGraphics.destroy();

        // ── HUD ICON TEXTURES (replacing emojis) ────────────
        this.createIconTextures();

        // ── Apply NEAREST filtering to all generated sprite textures ──
        // This keeps pixel art crisp while text stays smooth (LINEAR default).
        this.applyNearestFilter();
    }

    /** Set NEAREST filtering on every generated / loaded sprite texture so they
     *  stay crisp at any zoom, while text (rendered dynamically) keeps LINEAR. */
    applyNearestFilter() {
        const spriteKeys = [
            'plant', 'gumplant', 'saltgrass', 'pickleweed', 'cordgrass', 'jaumea',
            'fox', 'cat', 'harrier', 'harrier_dive',
            'cat_walking_1', 'cat_walking_2', 'cat_walking_3', 'cat_walking_4',
            'cat_pouncing', 'cat_with_kill',
            'water', 'water_edge', 'mud', 'grass',
            'seed', 'heart', 'dirt',
            'button', 'button_hover',
            'seedbank_bg', 'score_panel',
            'hud_panel', 'hud_panel_wide', 'hud_panel_bottom',
            // Icon textures (emoji replacements)
            'icon_trophy', 'icon_heart_green', 'icon_heart_broken',
            'icon_leaf', 'icon_flame', 'icon_wave',
            'icon_paw', 'icon_bolt', 'icon_target', 'icon_star',
            // Loaded sprite-sheet keys
            'rail_running_1', 'rail_running_2', 'rail_running_3', 'rail_running_4',
            'rail_hiding', 'rail_standing', 'rail_surprised', 'rail_calling',
            'fox_walking_1', 'fox_walking_2', 'fox_walking_3', 'fox_walking_4',
            'fox_pouncing', 'fox_with_kill',
        ];
        spriteKeys.forEach(key => {
            const tex = this.textures.get(key);
            if (tex && tex.source && tex.source[0]) {
                tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
        });
    }

    create() {
        // Transition to menu scene
        this.scene.start('MenuScene');
    }

    // ─── PLANT TEXTURE GENERATORS ────────────────────────────────

    /** Grindelia stricta – Gumplant: bushy, dark-green base, prominent yellow daisy heads */
    createGumplantTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const S = 48;
        // Leaf mass (layered circles, dark → light)
        g.fillStyle(0x1a5c1a);
        g.fillCircle(24, 34, 18);
        g.fillStyle(0x237023);
        g.fillCircle(16, 30, 13);
        g.fillCircle(32, 30, 13);
        g.fillStyle(0x2d8b2d);
        g.fillCircle(24, 24, 14);
        g.fillStyle(0x389438);
        g.fillCircle(20, 20, 8);
        g.fillCircle(28, 22, 7);
        // Flower heads – composite yellow discs with darker centres
        const flowers = [[18, 14, 6], [30, 16, 5], [24, 26, 4.5]];
        flowers.forEach(([fx, fy, fr]) => {
            g.fillStyle(0xd4a017);
            g.fillCircle(fx, fy, fr + 1);
            g.fillStyle(0xf0c929);
            g.fillCircle(fx, fy, fr);
            // Petal rays
            g.fillStyle(0xffd700);
            for (let a = 0; a < 6; a++) {
                const ang = (a / 6) * Math.PI * 2;
                g.fillCircle(fx + Math.cos(ang) * (fr - 1), fy + Math.sin(ang) * (fr - 1), 2);
            }
            // Dark disc centre
            g.fillStyle(0x8b6914);
            g.fillCircle(fx, fy, fr * 0.4);
        });
        // Stem hints at base
        g.fillStyle(0x3a6b24);
        g.fillRect(22, 38, 4, 10);
        g.generateTexture('gumplant', S, S);
        g.generateTexture('plant', S, S); // legacy alias
        g.destroy();
    }

    /** Distichlis spicata – Saltgrass: low tufts of blue-green grass blades */
    createSaltgrassTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const S = 48;
        // Soil mound
        g.fillStyle(0x5d4e37, 0.4);
        g.fillEllipse(24, 42, 36, 10);
        // Blade clusters – different greens, slight splay
        const blades = [
            { bx: 12, clr: 0x5a8a6a },
            { bx: 20, clr: 0x6b9e6e },
            { bx: 28, clr: 0x4e7a5c },
            { bx: 36, clr: 0x5a8a6a },
        ];
        blades.forEach(({ bx, clr }) => {
            for (let i = -2; i <= 2; i++) {
                const lean = i * 3;
                g.fillStyle(clr);
                g.fillTriangle(bx + lean, 10, bx - 2 + lean * 0.3, 42, bx + 2 + lean * 0.3, 42);
            }
        });
        // Seed heads (tiny)
        g.fillStyle(0xb8a97e);
        g.fillCircle(11, 10, 2);
        g.fillCircle(28, 8, 1.5);
        g.fillCircle(37, 11, 1.5);
        g.generateTexture('saltgrass', S, S);
        g.destroy();
    }

    /** Salicornia pacifica – Pickleweed: succulent segmented stems, green-to-red gradient */
    createPickleweedTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const S = 48;
        // Draw jointed succulent stems
        const stems = [
            { sx: 14, segments: 5, lean: -4 },
            { sx: 24, segments: 6, lean: 0 },
            { sx: 34, segments: 5, lean: 3 },
            { sx: 18, segments: 4, lean: -2 },
            { sx: 30, segments: 4, lean: 2 },
        ];
        stems.forEach(({ sx, segments, lean }) => {
            for (let i = 0; i < segments; i++) {
                const t = i / segments;
                const yPos = 42 - i * 6;
                const xPos = sx + lean * t;
                // Colour shifts from green at base to reddish at tip
                const r = Math.floor(0x3c + t * (0xb8 - 0x3c));
                const gv = Math.floor(0x8c - t * 0x30);
                const b = Math.floor(0x3c - t * 0x10);
                const col = (r << 16) | (gv << 8) | b;
                g.fillStyle(col);
                g.fillRoundedRect(xPos - 3, yPos - 3, 6, 7, 2);
                // Joint separator
                g.fillStyle(0x2a5c2a, 0.4);
                g.fillRect(xPos - 3, yPos + 3, 6, 1);
            }
        });
        // Tiny white salt crystals
        g.fillStyle(0xffffff, 0.35);
        [[12, 28], [26, 18], [35, 24], [20, 34]].forEach(([px, py]) => g.fillCircle(px, py, 1));
        g.generateTexture('pickleweed', S, S);
        g.destroy();
    }

    /** Spartina foliosa – California Cordgrass: tall, arching blades with seed plumes */
    createCordgrassTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const S = 48;
        // Base clump
        g.fillStyle(0x4a6b30, 0.3);
        g.fillEllipse(24, 44, 28, 8);
        // Tall arching blades
        const arcs = [
            { bx: 16, cp: -10, clr: 0x5a7a38 },
            { bx: 22, cp: -4, clr: 0x6a8a44 },
            { bx: 26, cp: 2, clr: 0x4e7032 },
            { bx: 30, cp: 6, clr: 0x5a7a38 },
            { bx: 34, cp: 10, clr: 0x6a8a44 },
        ];
        arcs.forEach(({ bx, cp, clr }) => {
            g.lineStyle(3, clr, 0.9);
            g.beginPath();
            g.moveTo(bx, 44);
            g.lineTo(bx + cp * 0.5, 24);
            g.lineTo(bx + cp, 6);
            g.stroke();
            // Thinner highlight
            g.lineStyle(1, 0x8aaa64, 0.4);
            g.beginPath();
            g.moveTo(bx + 1, 44);
            g.lineTo(bx + cp * 0.5 + 1, 24);
            g.lineTo(bx + cp + 1, 6);
            g.stroke();
        });
        // Seed plumes at tips
        g.fillStyle(0xc4b078);
        g.fillEllipse(6, 5, 6, 4);
        g.fillEllipse(24, 3, 5, 3);
        g.fillEllipse(44, 6, 6, 4);
        g.generateTexture('cordgrass', S, S);
        g.destroy();
    }

    // ─── CAT TEXTURE GENERATORS (feral tabby) ──────────────────

    /** Draw a shared cat body onto a Graphics object at a given leg phase.
     *  legPhase 0-3 controls walking animation. */
    _drawCat(g, W, H, legPhase, isPouncing, withKill) {
        // Colour palette - dark tabby
        const bodyDark = 0x3a3a3a;
        const bodyMid = 0x4f4f4f;
        const bodyLight = 0x5e5e5e;
        const belly = 0x6b6b6b;
        const stripe = 0x2a2a2a;
        const earInner = 0x6b4a4a;
        const eyeCol = 0xccdd00;

        const cx = W * 0.5;
        const cy = H * 0.55;

        // ── Tail (behind body) ──
        g.lineStyle(3, bodyMid, 0.9);
        if (isPouncing) {
            // Tail arched up in chase
            g.beginPath();
            g.moveTo(8, cy - 2);
            g.lineTo(4, cy - 10);
            g.lineTo(7, cy - 16);
            g.stroke();
        } else {
            const tailCurve = legPhase % 2 === 0 ? -3 : 3;
            g.beginPath();
            g.moveTo(8, cy);
            g.lineTo(4, cy + tailCurve - 4);
            g.lineTo(2, cy + tailCurve - 10);
            g.stroke();
            // Tail tip
            g.fillStyle(bodyDark);
            g.fillCircle(2, cy + tailCurve - 11, 2);
        }

        // ── Body ──
        g.fillStyle(bodyDark);
        g.fillEllipse(cx, cy, isPouncing ? 36 : 32, 14);
        // Lighter belly
        g.fillStyle(belly, 0.5);
        g.fillEllipse(cx, cy + 3, 26, 6);
        // Mid-tone overlay
        g.fillStyle(bodyMid, 0.4);
        g.fillEllipse(cx + 2, cy - 2, 24, 8);

        // ── Tabby stripes ──
        g.fillStyle(stripe, 0.6);
        for (let i = 0; i < 5; i++) {
            const sx = cx - 8 + i * 5;
            g.fillRect(sx, cy - 6, 2, 8);
        }

        // ── Legs ──
        const legY = cy + 5;
        const legLen = 10;
        // Front and back pairs with phase offsets
        const phases = [
            { fx: cx + 8, bx: cx - 8 },  // front, back
        ];
        phases.forEach(({ fx, bx }) => {
            if (isPouncing) {
                // Extended stride
                g.fillStyle(bodyDark);
                g.fillRect(fx + 2, legY, 3, legLen + 2);
                g.fillRect(fx - 2, legY, 3, legLen - 2);
                g.fillRect(bx + 2, legY, 3, legLen - 4);
                g.fillRect(bx - 2, legY, 3, legLen + 2);
                // Paws
                g.fillStyle(0x2a2a2a);
                g.fillEllipse(fx + 3, legY + legLen + 2, 4, 2);
                g.fillEllipse(bx - 1, legY + legLen + 2, 4, 2);
            } else {
                // Walking cycle
                const offsets = [
                    [0, 0, -2, 2],    // phase 0
                    [2, -2, 0, 0],    // phase 1
                    [0, 0, 2, -2],    // phase 2
                    [-2, 2, 0, 0],    // phase 3
                ];
                const o = offsets[legPhase] || offsets[0];
                g.fillStyle(bodyDark);
                g.fillRect(fx + 2, legY, 3, legLen + o[0]);
                g.fillRect(fx - 3, legY, 3, legLen + o[1]);
                g.fillRect(bx + 2, legY, 3, legLen + o[2]);
                g.fillRect(bx - 3, legY, 3, legLen + o[3]);
                // Paws
                g.fillStyle(0x2a2a2a);
                [fx + 3, fx - 2, bx + 3, bx - 2].forEach((px, i) => {
                    g.fillEllipse(px, legY + legLen + o[i] + 1, 4, 2);
                });
            }
        });

        // ── Head ──
        const headX = cx + 14;
        const headY = cy - 4;
        if (isPouncing) {
            // Head thrust forward
            g.fillStyle(bodyDark);
            g.fillCircle(headX + 4, headY + 2, 7);
            g.fillStyle(bodyMid, 0.5);
            g.fillCircle(headX + 4, headY + 1, 5);
        } else {
            g.fillStyle(bodyDark);
            g.fillCircle(headX, headY, 7);
            g.fillStyle(bodyMid, 0.5);
            g.fillCircle(headX, headY - 1, 5);
        }
        const hx = isPouncing ? headX + 4 : headX;
        const hy = isPouncing ? headY + 2 : headY;

        // Ears
        g.fillStyle(bodyDark);
        g.fillTriangle(hx - 5, hy - 5, hx - 2, hy - 12, hx + 1, hy - 5);
        g.fillTriangle(hx + 1, hy - 5, hx + 4, hy - 12, hx + 7, hy - 5);
        // Inner ear
        g.fillStyle(earInner, 0.6);
        g.fillTriangle(hx - 4, hy - 5, hx - 2, hy - 10, hx, hy - 5);
        g.fillTriangle(hx + 2, hy - 5, hx + 4, hy - 10, hx + 6, hy - 5);

        // Eyes
        g.fillStyle(eyeCol);
        g.fillCircle(hx - 2, hy - 1, 2);
        g.fillCircle(hx + 4, hy - 1, 2);
        // Pupils (vertical slits)
        g.fillStyle(0x000000);
        g.fillRect(hx - 2.5, hy - 2.5, 1, 3);
        g.fillRect(hx + 3.5, hy - 2.5, 1, 3);

        // Nose
        g.fillStyle(0x8b5e5e);
        g.fillTriangle(hx + 1, hy + 2, hx - 1, hy + 4, hx + 3, hy + 4);

        // Whiskers
        g.lineStyle(1, 0x888888, 0.5);
        g.beginPath();
        g.moveTo(hx - 3, hy + 3);
        g.lineTo(hx - 10, hy + 1);
        g.moveTo(hx - 3, hy + 4);
        g.lineTo(hx - 10, hy + 5);
        g.moveTo(hx + 7, hy + 3);
        g.lineTo(hx + 14, hy + 1);
        g.moveTo(hx + 7, hy + 4);
        g.lineTo(hx + 14, hy + 5);
        g.stroke();

        // ── Kill (prey in mouth) ──
        if (withKill) {
            // Small bird shape in mouth
            g.fillStyle(0x8b7355);
            g.fillEllipse(hx + 8, hy + 4, 8, 4);
            g.fillStyle(0x6b5a40);
            g.fillCircle(hx + 11, hy + 3, 2);
        }
    }

    createCatTextures() {
        const W = 56;
        const H = 36;

        // 4 walking frames
        for (let i = 0; i < 4; i++) {
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            this._drawCat(g, W, H, i, false, false);
            g.generateTexture(`cat_walking_${i + 1}`, W, H);
            g.destroy();
        }

        // Pouncing/chase frame
        const gP = this.make.graphics({ x: 0, y: 0, add: false });
        this._drawCat(gP, W, H, 0, true, false);
        gP.generateTexture('cat_pouncing', W, H);
        gP.destroy();

        // Standing with kill
        const gK = this.make.graphics({ x: 0, y: 0, add: false });
        this._drawCat(gK, W, H, 0, false, true);
        gK.generateTexture('cat_with_kill', W, H);
        gK.destroy();

        // Legacy alias so old 'cat' key still works as fallback
        const gLegacy = this.make.graphics({ x: 0, y: 0, add: false });
        this._drawCat(gLegacy, W, H, 0, false, false);
        gLegacy.generateTexture('cat', W, H);
        gLegacy.destroy();
    }

    // ─── HARRIER TEXTURE GENERATORS (Northern Harrier / Marsh Hawk) ───

    /** Draw a raptor silhouette shadow with proper wing morphology */
    _drawHarrier(g, W, H, isDiving) {
        const alpha = isDiving ? 0.7 : 0.5;

        if (isDiving) {
            // ── Diving pose: wings swept back, elongated body ──
            // Body - elongated teardrop
            g.fillStyle(0x1a1a1a, alpha);
            g.fillEllipse(W * 0.5, H * 0.5, 20, 10);

            // Swept-back wings
            g.fillStyle(0x222222, alpha);
            // Left wing
            g.fillTriangle(
                W * 0.5 - 4, H * 0.5 - 2,
                W * 0.5 - 24, H * 0.5 + 6,
                W * 0.5 - 2, H * 0.5 + 2
            );
            // Right wing
            g.fillTriangle(
                W * 0.5 + 4, H * 0.5 - 2,
                W * 0.5 + 24, H * 0.5 + 6,
                W * 0.5 + 2, H * 0.5 + 2
            );

            // Primary feather tips (jagged wing edge)
            g.fillStyle(0x1a1a1a, alpha * 0.7);
            for (let i = 0; i < 4; i++) {
                const wx = W * 0.5 - 18 - i * 2;
                const wy = H * 0.5 + 4 + i;
                g.fillRect(wx, wy, 3, 2);
                g.fillRect(W - wx - 3, wy, 3, 2);
            }

            // Head
            g.fillStyle(0x1a1a1a, alpha);
            g.fillCircle(W * 0.5, H * 0.5 - 4, 4);
            // Beak
            g.fillTriangle(
                W * 0.5, H * 0.5 - 8,
                W * 0.5 - 1.5, H * 0.5 - 4,
                W * 0.5 + 1.5, H * 0.5 - 4
            );

            // Tail - narrow
            g.fillStyle(0x222222, alpha);
            g.fillTriangle(
                W * 0.5 - 3, H * 0.5 + 5,
                W * 0.5, H * 0.5 + 14,
                W * 0.5 + 3, H * 0.5 + 5
            );
        } else {
            // ── Gliding pose: wings fully spread, soaring ──
            const cx = W * 0.5;
            const cy = H * 0.5;

            // Body - slender fusiform
            g.fillStyle(0x1a1a1a, alpha);
            g.fillEllipse(cx, cy, 16, 8);

            // Wings - long, broad, slightly forward-swept (harrier characteristic)
            // Wing membrane (broad shape)
            g.fillStyle(0x222222, alpha);
            // Left wing
            g.beginPath();
            g.moveTo(cx - 3, cy - 1);
            g.lineTo(cx - 14, cy - 6);
            g.lineTo(cx - 28, cy - 4);
            g.lineTo(cx - 30, cy - 2);
            g.lineTo(cx - 26, cy + 1);
            g.lineTo(cx - 14, cy + 2);
            g.lineTo(cx - 3, cy + 1);
            g.closePath();
            g.fill();
            // Right wing
            g.beginPath();
            g.moveTo(cx + 3, cy - 1);
            g.lineTo(cx + 14, cy - 6);
            g.lineTo(cx + 28, cy - 4);
            g.lineTo(cx + 30, cy - 2);
            g.lineTo(cx + 26, cy + 1);
            g.lineTo(cx + 14, cy + 2);
            g.lineTo(cx + 3, cy + 1);
            g.closePath();
            g.fill();

            // Darker wing centres (coverts shadow)
            g.fillStyle(0x111111, alpha * 0.5);
            g.fillEllipse(cx - 16, cy - 2, 16, 4);
            g.fillEllipse(cx + 16, cy - 2, 16, 4);

            // Primary feather separations (fingered wing tips)
            g.lineStyle(1, 0x0a0a0a, alpha * 0.6);
            for (let i = 0; i < 5; i++) {
                const fx = cx - 24 - i * 1.5;
                const fy = cy - 3 + i * 1;
                g.beginPath();
                g.moveTo(fx, fy);
                g.lineTo(fx - 2, fy + 1.5);
                g.stroke();
                // Mirror
                g.beginPath();
                g.moveTo(W - fx, fy);
                g.lineTo(W - fx + 2, fy + 1.5);
                g.stroke();
            }

            // White rump patch (male Northern Harrier characteristic)
            g.fillStyle(0x888888, alpha * 0.6);
            g.fillEllipse(cx, cy + 3, 6, 3);

            // Head
            g.fillStyle(0x1a1a1a, alpha);
            g.fillCircle(cx, cy - 4, 3.5);
            // Facial disc (harrier characteristic - owl-like face)
            g.fillStyle(0x333333, alpha * 0.4);
            g.fillCircle(cx, cy - 4, 2.5);
            // Beak
            g.fillTriangle(cx, cy - 8, cx - 1, cy - 5, cx + 1, cy - 5);

            // Tail - long, rounded (harrier diagnostic)
            g.fillStyle(0x222222, alpha);
            g.beginPath();
            g.moveTo(cx - 4, cy + 4);
            g.lineTo(cx - 3, cy + 12);
            g.lineTo(cx, cy + 14);
            g.lineTo(cx + 3, cy + 12);
            g.lineTo(cx + 4, cy + 4);
            g.closePath();
            g.fill();
            // Tail barring
            g.lineStyle(1, 0x1a1a1a, alpha * 0.4);
            g.beginPath();
            g.moveTo(cx - 3, cy + 8);
            g.lineTo(cx + 3, cy + 8);
            g.stroke();
            g.beginPath();
            g.moveTo(cx - 2, cy + 11);
            g.lineTo(cx + 2, cy + 11);
            g.stroke();
        }

        // Ground shadow blur (faint outer glow)
        g.fillStyle(0x000000, 0.08);
        g.fillEllipse(W * 0.5, H * 0.5 + 2, isDiving ? 28 : 64, isDiving ? 14 : 18);
    }

    createHarrierTextures() {
        const W = 72;
        const H = 36;

        // Gliding pose
        const gGlide = this.make.graphics({ x: 0, y: 0, add: false });
        this._drawHarrier(gGlide, W, H, false);
        gGlide.generateTexture('harrier', W, H);
        gGlide.destroy();

        // Diving pose
        const gDive = this.make.graphics({ x: 0, y: 0, add: false });
        this._drawHarrier(gDive, W, H, true);
        gDive.generateTexture('harrier_dive', W, H);
        gDive.destroy();
    }

    /** Jaumea carnosa – fleshy marsh jaumea: low, succulent leaves with small yellow flowers */
    createJaumeaTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const S = 48;
        // Low spreading mat of fleshy leaves
        const leaves = [
            [12, 36], [20, 32], [28, 34], [36, 32],
            [16, 28], [24, 26], [32, 28],
            [10, 42], [24, 40], [38, 40],
        ];
        leaves.forEach(([lx, ly]) => {
            g.fillStyle(0x4a8c5a);
            g.fillEllipse(lx, ly, 10, 5);
            // Fleshy highlight
            g.fillStyle(0x6aac6a, 0.5);
            g.fillEllipse(lx, ly - 1, 7, 3);
        });
        // Small composite yellow flower heads
        const fls = [[16, 22], [32, 20], [24, 16]];
        fls.forEach(([fx, fy]) => {
            g.fillStyle(0xe8c840);
            g.fillCircle(fx, fy, 4);
            // Petals
            g.fillStyle(0xf5dc6e);
            for (let a = 0; a < 5; a++) {
                const ang = (a / 5) * Math.PI * 2;
                g.fillCircle(fx + Math.cos(ang) * 3, fy + Math.sin(ang) * 3, 1.8);
            }
            g.fillStyle(0xa08820);
            g.fillCircle(fx, fy, 1.5);
        });
        g.generateTexture('jaumea', S, S);
        g.destroy();
    }

    // ─── ICON TEXTURES (emoji replacements) ──────────────────

    createIconTextures() {
        const S = 20; // icon size

        // Trophy (replaces 🏆)
        this._makeIcon('icon_trophy', S, (g) => {
            // Cup
            g.fillStyle(0xf1c40f);
            g.fillRoundedRect(5, 3, 10, 8, 2);
            // Handles
            g.lineStyle(2, 0xf1c40f);
            g.beginPath();
            g.arc(4, 7, 3, Math.PI * 0.5, Math.PI * 1.5, false);
            g.stroke();
            g.beginPath();
            g.arc(16, 7, 3, -Math.PI * 0.5, Math.PI * 0.5, false);
            g.stroke();
            // Stem
            g.fillStyle(0xd4ac0d);
            g.fillRect(8, 11, 4, 3);
            // Base
            g.fillStyle(0xf1c40f);
            g.fillRoundedRect(6, 14, 8, 3, 1);
        });

        // Green heart / check-heart (replaces 💚)
        this._makeIcon('icon_heart_green', S, (g) => {
            g.fillStyle(0x27ae60);
            g.fillCircle(7, 7, 4);
            g.fillCircle(13, 7, 4);
            g.fillTriangle(3, 9, 10, 17, 17, 9);
        });

        // Broken heart (replaces 💔)
        this._makeIcon('icon_heart_broken', S, (g) => {
            g.fillStyle(0xe74c3c);
            g.fillCircle(7, 7, 4);
            g.fillCircle(13, 7, 4);
            g.fillTriangle(3, 9, 10, 17, 17, 9);
            // Crack line
            g.lineStyle(1.5, 0x1a1a1a, 0.8);
            g.beginPath();
            g.moveTo(10, 5);
            g.lineTo(8, 9);
            g.lineTo(12, 11);
            g.lineTo(10, 16);
            g.stroke();
        });

        // Leaf (replaces 🌿)
        this._makeIcon('icon_leaf', S, (g) => {
            // Leaf shape
            g.fillStyle(0x27ae60);
            g.beginPath();
            g.moveTo(10, 2);
            g.lineTo(17, 8);
            g.lineTo(14, 14);
            g.lineTo(10, 16);
            g.lineTo(6, 14);
            g.lineTo(3, 8);
            g.closePath();
            g.fill();
            // Vein
            g.lineStyle(1, 0x1a5c1a, 0.6);
            g.beginPath();
            g.moveTo(10, 3);
            g.lineTo(10, 15);
            g.stroke();
            g.beginPath();
            g.moveTo(10, 7);
            g.lineTo(7, 10);
            g.stroke();
            g.beginPath();
            g.moveTo(10, 9);
            g.lineTo(13, 12);
            g.stroke();
        });

        // Flame (replaces 🔥)
        this._makeIcon('icon_flame', S, (g) => {
            g.fillStyle(0xe67e22);
            g.beginPath();
            g.moveTo(10, 2);
            g.lineTo(14, 8);
            g.lineTo(16, 14);
            g.lineTo(13, 18);
            g.lineTo(7, 18);
            g.lineTo(4, 14);
            g.lineTo(6, 8);
            g.closePath();
            g.fill();
            // Inner flame
            g.fillStyle(0xf39c12);
            g.beginPath();
            g.moveTo(10, 6);
            g.lineTo(13, 11);
            g.lineTo(12, 16);
            g.lineTo(8, 16);
            g.lineTo(7, 11);
            g.closePath();
            g.fill();
            // Core
            g.fillStyle(0xf1c40f);
            g.fillEllipse(10, 14, 4, 5);
        });

        // Wave (replaces 🌊)
        this._makeIcon('icon_wave', S, (g) => {
            g.lineStyle(2.5, 0x3498db);
            g.beginPath();
            g.moveTo(1, 10);
            for (let x = 0; x <= S; x += 1) {
                g.lineTo(x, 10 + Math.sin(x * 0.6) * 3);
            }
            g.stroke();
            g.lineStyle(2, 0x2980b9, 0.6);
            g.beginPath();
            g.moveTo(1, 15);
            for (let x = 0; x <= S; x += 1) {
                g.lineTo(x, 15 + Math.sin((x + 4) * 0.6) * 2);
            }
            g.stroke();
        });

        // Paw print (replaces 🦊 as predator icon)
        this._makeIcon('icon_paw', S, (g) => {
            g.fillStyle(0xd4ac0d);
            // Pad
            g.fillEllipse(10, 13, 8, 6);
            // Toes
            g.fillCircle(5, 7, 2.5);
            g.fillCircle(9, 5, 2.5);
            g.fillCircle(13, 5.5, 2.5);
            g.fillCircle(16, 8, 2.5);
        });

        // Lightning bolt (replaces ⚡)
        this._makeIcon('icon_bolt', S, (g) => {
            g.fillStyle(0xf1c40f);
            g.beginPath();
            g.moveTo(12, 1);
            g.lineTo(5, 10);
            g.lineTo(9, 10);
            g.lineTo(7, 19);
            g.lineTo(15, 9);
            g.lineTo(11, 9);
            g.closePath();
            g.fill();
        });

        // Target / crosshair (replaces 🎯)
        this._makeIcon('icon_target', S, (g) => {
            g.lineStyle(2, 0xe74c3c);
            g.strokeCircle(10, 10, 7);
            g.strokeCircle(10, 10, 3);
            g.fillStyle(0xe74c3c);
            g.fillCircle(10, 10, 1.5);
        });

        // Star (generic reward icon)
        this._makeIcon('icon_star', S, (g) => {
            g.fillStyle(0xf1c40f);
            const cx = 10, cy = 10, spikes = 5, outer = 8, inner = 4;
            g.beginPath();
            for (let i = 0; i < spikes * 2; i++) {
                const r = i % 2 === 0 ? outer : inner;
                const angle = (i * Math.PI / spikes) - Math.PI / 2;
                const px = cx + Math.cos(angle) * r;
                const py = cy + Math.sin(angle) * r;
                if (i === 0) g.moveTo(px, py);
                else g.lineTo(px, py);
            }
            g.closePath();
            g.fill();
        });
    }

    /** Helper to create a small icon texture */
    _makeIcon(key, size, drawFn) {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        drawFn(g);
        g.generateTexture(key, size, size);
        g.destroy();
    }
}
