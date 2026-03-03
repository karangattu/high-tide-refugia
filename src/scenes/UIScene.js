import * as Phaser from 'phaser';

// Hi-DPI text resolution multiplier
const TEXT_RES = window.devicePixelRatio || 2;

/**
 * Professional in-game HUD.
 * Top-left: Seed panel | Top-centre: Level | Top-right: Score + combo
 * Bottom-centre: Saved / Lost stats pill
 */
export class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    /* ─── Lifecycle ─────────────────────────────────────────── */

    create() {
        const { width, height } = this.scale;
        const gameScene = this.scene.get('GameScene');

        const PAD = 12;          // edge padding
        const BAR_H = 52;        // top-bar height

        // ── TOP-LEFT: Seed Bank ──────────────────────────────
        this.createSeedPanel(PAD, PAD);

        // ── TOP-CENTER: Level label ──────────────────────────
        this.createLevelLabel(width / 2, PAD);

        // ── TOP-RIGHT: Score + combo ─────────────────────────
        this.createScorePanel(width - PAD, PAD);

        // ── BOTTOM-CENTER: Saved / Lost stats ────────────────
        this.createStatsBar(width / 2, height - PAD);

        // ── Events ───────────────────────────────────────────
        gameScene.events.on('seedsUpdate', this.updateSeedBank, this);
        gameScene.events.on('scoreUpdate', this.updateScore, this);
        gameScene.events.on('statsUpdate', this.updateStats, this);
        gameScene.events.on('pauseToggle', this.togglePauseOverlay, this);

        this.events.on('shutdown', () => {
            gameScene.events.off('seedsUpdate', this.updateSeedBank, this);
            gameScene.events.off('scoreUpdate', this.updateScore, this);
            gameScene.events.off('statsUpdate', this.updateStats, this);
            gameScene.events.off('pauseToggle', this.togglePauseOverlay, this);
        });
    }

    /* ─── Seed Bank (top-left) ──────────────────────────────── */

    createSeedPanel(x, y) {
        // Panel bg
        this.add.image(x + 130, y + 26, 'hud_panel_wide').setOrigin(0.5);

        // Seed icon (small)
        this.add.image(x + 18, y + 26, 'seed').setScale(1.2);

        // Label
        this.add.text(x + 34, y + 8, 'SEEDS', {
            fontFamily: 'Outfit',
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#f39c12',
            resolution: TEXT_RES,
        });

        // Numeric counter (compact)
        this.seedsText = this.add.text(x + 34, y + 22, '8 / 10', {
            fontFamily: 'Outfit',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        });

        // Progress bar track
        const barX = x + 100;
        const barY = y + 26;
        const barW = 140;
        const barH = 8;
        this.seedBarBg = this.add.rectangle(barX + barW / 2, barY, barW, barH, 0x1a1a1a)
            .setOrigin(0.5);
        // Rounded cap illusion
        this.add.rectangle(barX + barW / 2, barY, barW + 2, barH + 2, 0x333333)
            .setOrigin(0.5).setDepth(-1);

        // Fill
        this.seedBarFill = this.add.rectangle(barX, barY, barW, barH, 0xf39c12)
            .setOrigin(0, 0.5);
        this._seedBarX = barX;
        this._seedBarW = barW;
    }

    /* ─── Level label (top-centre) ──────────────────────────── */

    createLevelLabel(cx, y) {
        this.levelText = this.add.text(cx, y + 26, 'LEVEL 1', {
            fontFamily: 'Outfit',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            resolution: TEXT_RES,
        }).setOrigin(0.5);
    }

    /* ─── Score + combo (top-right) ─────────────────────────── */

    createScorePanel(right, y) {
        const pw = 220;
        const cx = right - pw / 2;
        this.add.image(cx, y + 26, 'hud_panel').setOrigin(0.5);

        // Trophy icon
        this.add.image(cx - 96, y + 26, 'icon_trophy').setScale(0.9);

        // Score value
        this.scoreText = this.add.text(cx - 74, y + 26, '0', {
            fontFamily: 'Outfit',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);

        // Combo chip
        this.comboText = this.add.text(cx + 50, y + 26, 'x1.0', {
            fontFamily: 'Outfit',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#f1c40f',
            backgroundColor: '#1a1a1a80',
            padding: { x: 6, y: 2 },
            resolution: TEXT_RES,
        }).setOrigin(0.5).setAlpha(0.4);
    }

    /* ─── Bottom stats bar ──────────────────────────────────── */

    createStatsBar(cx, bottom) {
        const BY = bottom - 18;
        this.add.image(cx, BY, 'hud_panel_bottom').setOrigin(0.5);

        // Saved icon
        this.add.image(cx - 120, BY, 'icon_heart_green').setScale(0.8);
        this.savedText = this.add.text(cx - 102, BY, '0 saved', {
            fontFamily: 'Outfit',
            fontSize: '13px',
            color: '#27ae60',
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);

        // Divider dot
        this.add.text(cx - 20, BY, '·', {
            fontFamily: 'Outfit',
            fontSize: '16px',
            color: '#555555',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        // Lost icon
        this.add.image(cx + 10, BY, 'icon_heart_broken').setScale(0.8);
        this.lostText = this.add.text(cx + 28, BY, '0 lost', {
            fontFamily: 'Outfit',
            fontSize: '13px',
            color: '#e74c3c',
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);
    }

    /* ─── Update callbacks ──────────────────────────────────── */

    updateSeedBank(current, max) {
        // Integer display — no decimals
        const c = Math.round(current);
        const m = Math.round(max);
        this.seedsText.setText(`${c} / ${m}`);

        // Bar fill
        const pct = Math.max(0, Math.min(1, c / m));
        this.seedBarFill.width = this._seedBarW * pct;

        // Colour coding
        if (pct > 0.5) {
            this.seedBarFill.setFillStyle(0xf39c12);       // amber
        } else if (pct > 0.25) {
            this.seedBarFill.setFillStyle(0xe67e22);       // orange
        } else {
            this.seedBarFill.setFillStyle(0xe74c3c);       // red
            // Gentle pulse when low
            if (!this._lowPulsing) {
                this._lowPulsing = true;
                this.tweens.add({
                    targets: this.seedsText,
                    alpha: { from: 1, to: 0.45 },
                    duration: 400,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => { this._lowPulsing = false; }
                });
            }
        }
    }

    updateScore(score, comboMultiplier) {
        const prev = parseInt(this.scoreText.text) || 0;
        this.scoreText.setText(Math.round(score).toString());

        if (score > prev) {
            this.tweens.add({
                targets: this.scoreText,
                scaleX: 1.15,
                scaleY: 1.15,
                duration: 80,
                yoyo: true,
            });
        }

        if (comboMultiplier > 1) {
            this.comboText.setText(`x${comboMultiplier.toFixed(1)}`);
            this.comboText.setAlpha(1);
        } else {
            this.comboText.setText('x1.0');
            this.comboText.setAlpha(0.4);
        }
    }

    updateStats(stats) {
        this.savedText.setText(`${stats.railsSaved} saved`);
        this.lostText.setText(`${stats.railsLost} lost`);

        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.levelManager) {
            const progress = gameScene.levelManager.getLevelProgress();
            this.levelText.setText(`LEVEL ${progress.level} \u2013 ${progress.levelName}`);
        }
    }

    /* ─── Pause overlay ─────────────────────────────────────── */

    togglePauseOverlay(isPaused) {
        if (isPaused) {
            this.pauseOverlay = this.add.rectangle(
                this.scale.width / 2,
                this.scale.height / 2,
                this.scale.width,
                this.scale.height,
                0x000000, 0.7
            ).setDepth(200);

            this.pauseText = this.add.text(
                this.scale.width / 2,
                this.scale.height / 2,
                'PAUSED\n\nPress ESC to resume',
                {
                    fontFamily: 'Outfit',
                    fontSize: '36px',
                    fontStyle: 'bold',
                    color: '#ffffff',
                    align: 'center',
                    resolution: TEXT_RES,
                }
            ).setOrigin(0.5).setDepth(201);
        } else {
            if (this.pauseOverlay) { this.pauseOverlay.destroy(); this.pauseOverlay = null; }
            if (this.pauseText) { this.pauseText.destroy(); this.pauseText = null; }
        }
    }
}
