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
        const panelW = compact ? 210 : 320;
        const panelH = compact ? 56 : 68;
        const cx = x + panelW / 2;
        const cy = y + panelH / 2;

        this.add.image(cx, cy, 'hud_panel_wide')
            .setOrigin(0.5)
            .setScale(panelW / 260, panelH / 52);

        this.add.image(x + (compact ? 18 : 26), cy, 'seed').setScale(compact ? 1.15 : 1.5);

        this.add.text(x + (compact ? 34 : 46), y + (compact ? 7 : 10), 'SEEDS', {
            fontFamily: 'Outfit',
            fontSize: compact ? '13px' : '15px',
            fontStyle: 'bold',
            color: '#f39c12',
            resolution: TEXT_RES,
        });

        this.seedsText = this.add.text(x + (compact ? 34 : 46), y + (compact ? 21 : 28), '8 / 10', {
            fontFamily: 'Outfit',
            fontSize: compact ? '18px' : '24px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        });

        const barX = x + (compact ? 100 : 140);
        const barW = compact ? 96 : 160;
        const barH = compact ? 9 : 11;
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
        const panelW = compact ? 230 : 300;
        const panelH = compact ? 48 : 58;
        const cy = y + (compact ? 27 : 33);

        this.add.image(cx, cy, 'hud_flock_panel')
            .setOrigin(0.5)
            .setScale(panelW / 240, panelH / 44);

        const spread = compact ? 62 : 84;

        this.waveText = this.add.text(cx - spread, cy, 'WAVE 1/3', {
            fontFamily: 'Outfit',
            fontSize: compact ? '14px' : '16px',
            fontStyle: 'bold',
            color: '#f1c40f',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        this.add.text(cx - spread / 3, cy, '·', {
            fontFamily: 'Outfit',
            fontSize: '18px',
            color: '#445544',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        this.add.image(cx - 3, cy, 'icon_heart_green').setScale(compact ? 0.7 : 0.9);
        this.savedText = this.add.text(cx + (compact ? 13 : 17), cy, '0', {
            fontFamily: 'Outfit',
            fontSize: compact ? '15px' : '18px',
            fontStyle: 'bold',
            color: '#2ecc71',
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);

        this.add.text(cx + spread / 3 + 4, cy, '·', {
            fontFamily: 'Outfit',
            fontSize: '18px',
            color: '#445544',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        this.add.image(cx + spread - (compact ? 20 : 28), cy, 'icon_heart_broken').setScale(compact ? 0.7 : 0.9);
        this.lostText = this.add.text(cx + spread - (compact ? 7 : 10), cy, '0/5', {
            fontFamily: 'Outfit',
            fontSize: compact ? '15px' : '18px',
            fontStyle: 'bold',
            color: '#e74c3c',
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);
    }

    createScorePanel(right, y, compact) {
        const pw = compact ? 200 : 270;
        const ph = compact ? 56 : 68;
        const cx = right - pw / 2;
        const cy = y + ph / 2;

        this.add.image(cx, cy, 'hud_panel')
            .setOrigin(0.5)
            .setScale(pw / 220, ph / 52);

        this.add.image(cx - (compact ? 74 : 104), cy, 'icon_trophy').setScale(compact ? 1.0 : 1.3);

        this.add.text(cx - (compact ? 54 : 78), y + (compact ? 7 : 10), 'POINTS', {
            fontFamily: 'Outfit',
            fontSize: compact ? '12px' : '14px',
            fontStyle: 'bold',
            color: '#f1c40f',
            resolution: TEXT_RES,
        });

        this.scoreText = this.add.text(cx - (compact ? 54 : 78), y + (compact ? 20 : 27), '0', {
            fontFamily: 'Outfit',
            fontSize: compact ? '19px' : '26px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        }).setOrigin(0, 0);

        this.comboText = this.add.text(cx + (compact ? 48 : 72), cy, 'x1.0', {
            fontFamily: 'Outfit',
            fontSize: compact ? '14px' : '17px',
            fontStyle: 'bold',
            color: '#f1c40f',
            backgroundColor: '#1a1a1a90',
            padding: { x: 6, y: 4 },
            resolution: TEXT_RES,
        }).setOrigin(0.5).setAlpha(0.4);
    }

    createFooter(width, height, compact) {
        const footerH = compact ? 40 : 50;
        const cy = height - footerH / 2;

        this.add.image(width / 2, cy, 'hud_footer_bar')
            .setOrigin(0.5)
            .setScale(width / 960, footerH / 44);

        const brand = compact
            ? '🌿 SF BAY REFUGE'
            : "🌿 SAN FRANCISCO BAY ESTUARY · RIDGWAY'S RAIL REFUGE";

        this.add.text(compact ? 14 : 26, cy, brand, {
            fontFamily: 'Outfit',
            fontSize: compact ? '14px' : '16px',
            fontStyle: 'bold',
            color: '#2ecc71',
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);

        const tip = compact
            ? 'Plant refugia to save Rails'
            : 'Rising King Tide · Plant Gumplant & Cordgrass corridors to guide Rails to safety';

        this.footerTipText = this.add.text(width / 2 + (compact ? 40 : 50), cy, tip, {
            fontFamily: 'Outfit',
            fontSize: compact ? '13px' : '15px',
            color: '#b0c4b1',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        if (!compact) {
            this.add.text(width - 26, cy, '[ESC] PAUSE', {
                fontFamily: 'Outfit',
                fontSize: '15px',
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
                    fontSize: '52px',
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
