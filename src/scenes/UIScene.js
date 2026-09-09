import * as Phaser from 'phaser';

const TEXT_RES = window.devicePixelRatio || 2;

export class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        const { width, height } = this.scale;
        const gameScene = this.scene.get('GameScene');
        const compact = width < 600;

        const PAD = compact ? 6 : 12;

        this.createSeedPanel(PAD, PAD, compact);
        this.createHeaderStatus(width / 2, PAD, compact);
        this.createScorePanel(width - PAD, PAD, compact);
        this.createFooter(width, height, compact);

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

    createSeedPanel(x, y, compact) {
        const panelW = compact ? 160 : 250;
        const panelH = compact ? 42 : 52;
        const cx = x + panelW / 2;
        const cy = y + panelH / 2;

        this.add.image(cx, cy, 'hud_panel_wide')
            .setOrigin(0.5)
            .setScale(panelW / 260, panelH / 52);

        this.add.image(x + (compact ? 14 : 20), cy, 'seed').setScale(compact ? 0.9 : 1.25);

        this.add.text(x + (compact ? 28 : 38), y + (compact ? 5 : 8), 'SEEDS', {
            fontFamily: 'Outfit',
            fontSize: compact ? '9px' : '11px',
            fontStyle: 'bold',
            color: '#f39c12',
            resolution: TEXT_RES,
        });

        this.seedsText = this.add.text(x + (compact ? 28 : 38), y + (compact ? 16 : 22), '8 / 10', {
            fontFamily: 'Outfit',
            fontSize: compact ? '13px' : '17px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        });

        const barX = x + (compact ? 78 : 108);
        const barW = compact ? 72 : 126;
        const barH = compact ? 7 : 9;
        this.seedBarBg = this.add.rectangle(barX + barW / 2, cy, barW, barH, 0x141414)
            .setOrigin(0.5);
        this.add.rectangle(barX + barW / 2, cy, barW + 2, barH + 2, 0x2d3a24)
            .setOrigin(0.5).setDepth(-1);

        this.seedBarFill = this.add.rectangle(barX, cy, barW, barH, 0xf39c12)
            .setOrigin(0, 0.5);
        this._seedBarX = barX;
        this._seedBarW = barW;
    }

    createHeaderStatus(cx, y, compact) {
        const panelW = compact ? 170 : 230;
        const panelH = compact ? 36 : 44;
        const cy = y + (compact ? 21 : 26);

        this.add.image(cx, cy, 'hud_flock_panel')
            .setOrigin(0.5)
            .setScale(panelW / 240, panelH / 44);

        const spread = compact ? 46 : 64;

        this.waveText = this.add.text(cx - spread, cy, 'WAVE 1/3', {
            fontFamily: 'Outfit',
            fontSize: compact ? '10px' : '12px',
            fontStyle: 'bold',
            color: '#f1c40f',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        this.add.text(cx - spread / 3, cy, '·', {
            fontFamily: 'Outfit',
            fontSize: '14px',
            color: '#445544',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        this.add.image(cx - 2, cy, 'icon_heart_green').setScale(compact ? 0.55 : 0.7);
        this.savedText = this.add.text(cx + (compact ? 10 : 13), cy, '0', {
            fontFamily: 'Outfit',
            fontSize: compact ? '11px' : '13px',
            fontStyle: 'bold',
            color: '#2ecc71',
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);

        this.add.text(cx + spread / 3 + 4, cy, '·', {
            fontFamily: 'Outfit',
            fontSize: '14px',
            color: '#445544',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        this.add.image(cx + spread - (compact ? 16 : 22), cy, 'icon_heart_broken').setScale(compact ? 0.55 : 0.7);
        this.lostText = this.add.text(cx + spread - (compact ? 5 : 8), cy, '0/5', {
            fontFamily: 'Outfit',
            fontSize: compact ? '11px' : '13px',
            fontStyle: 'bold',
            color: '#e74c3c',
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);
    }

    createScorePanel(right, y, compact) {
        const pw = compact ? 150 : 210;
        const ph = compact ? 42 : 52;
        const cx = right - pw / 2;
        const cy = y + ph / 2;

        this.add.image(cx, cy, 'hud_panel')
            .setOrigin(0.5)
            .setScale(pw / 220, ph / 52);

        this.add.image(cx - (compact ? 58 : 84), cy, 'icon_trophy').setScale(compact ? 0.8 : 1.05);

        this.add.text(cx - (compact ? 42 : 62), y + (compact ? 5 : 8), 'POINTS', {
            fontFamily: 'Outfit',
            fontSize: compact ? '8px' : '10px',
            fontStyle: 'bold',
            color: '#f1c40f',
            resolution: TEXT_RES,
        });

        this.scoreText = this.add.text(cx - (compact ? 42 : 62), y + (compact ? 15 : 21), '0', {
            fontFamily: 'Outfit',
            fontSize: compact ? '14px' : '19px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        }).setOrigin(0, 0);

        this.comboText = this.add.text(cx + (compact ? 36 : 56), cy, 'x1.0', {
            fontFamily: 'Outfit',
            fontSize: compact ? '10px' : '12px',
            fontStyle: 'bold',
            color: '#f1c40f',
            backgroundColor: '#1a1a1a90',
            padding: { x: 5, y: 3 },
            resolution: TEXT_RES,
        }).setOrigin(0.5).setAlpha(0.4);
    }

    createFooter(width, height, compact) {
        const footerH = compact ? 30 : 38;
        const cy = height - footerH / 2;

        this.add.image(width / 2, cy, 'hud_footer_bar')
            .setOrigin(0.5)
            .setScale(width / 960, footerH / 44);

        const brand = compact
            ? '🌿 SF BAY REFUGE'
            : "🌿 SAN FRANCISCO BAY ESTUARY · RIDGWAY'S RAIL REFUGE";

        this.add.text(compact ? 10 : 20, cy, brand, {
            fontFamily: 'Outfit',
            fontSize: compact ? '10px' : '12px',
            fontStyle: 'bold',
            color: '#2ecc71',
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);

        const tip = compact
            ? 'Plant refugia to save Rails'
            : 'Rising King Tide · Plant Gumplant & Cordgrass corridors to guide Rails to safety';

        this.footerTipText = this.add.text(width / 2 + (compact ? 30 : 40), cy, tip, {
            fontFamily: 'Outfit',
            fontSize: compact ? '9px' : '11px',
            color: '#b0c4b1',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        if (!compact) {
            this.add.text(width - 20, cy, '[ESC] PAUSE', {
                fontFamily: 'Outfit',
                fontSize: '11px',
                color: '#65806e',
                resolution: TEXT_RES,
            }).setOrigin(1, 0.5);
        }
    }

    updateSeedBank(current, max) {
        const c = Math.round(current);
        const m = Math.round(max);
        this.seedsText.setText(`${c} / ${m}`);

        const pct = Math.max(0, Math.min(1, c / m));
        this.seedBarFill.width = this._seedBarW * pct;

        if (pct > 0.5) {
            this.seedBarFill.setFillStyle(0xf39c12);
        } else if (pct > 0.25) {
            this.seedBarFill.setFillStyle(0xe67e22);
        } else {
            this.seedBarFill.setFillStyle(0xe74c3c);
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
        if (this.savedText) this.savedText.setText(`${stats.railsSaved}`);
        if (this.lostText) this.lostText.setText(`${stats.railsLost}/5`);

        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.levelManager && this.waveText) {
            const progress = gameScene.levelManager.getLevelProgress();
            this.waveText.setText(`WAVE ${progress.wave}/${progress.totalWaves}`);
        }
    }

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
