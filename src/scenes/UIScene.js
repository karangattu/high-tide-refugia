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
        this.createLevelLabel(width / 2, PAD, compact);
        this.createScorePanel(width - PAD, PAD, compact);
        this.createStatsBar(width / 2, height - PAD, compact);

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
        const panelW = compact ? 160 : 260;
        const panelH = compact ? 40 : 52;
        const cx = x + panelW / 2;
        const cy = y + panelH / 2;

        this.add.image(cx, cy, 'hud_panel_wide')
            .setOrigin(0.5)
            .setScale(panelW / 260, panelH / 52);

        this.add.image(x + (compact ? 12 : 18), cy, 'seed').setScale(compact ? 0.8 : 1.2);

        this.add.text(x + (compact ? 26 : 34), y + (compact ? 4 : 8), 'SEEDS', {
            fontFamily: 'Outfit',
            fontSize: compact ? '8px' : '10px',
            fontStyle: 'bold',
            color: '#f39c12',
            resolution: TEXT_RES,
        });

        this.seedsText = this.add.text(x + (compact ? 26 : 34), y + (compact ? 14 : 22), '8 / 10', {
            fontFamily: 'Outfit',
            fontSize: compact ? '12px' : '16px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        });

        const barX = x + (compact ? 70 : 100);
        const barW = compact ? 80 : 140;
        const barH = compact ? 6 : 8;
        this.seedBarBg = this.add.rectangle(barX + barW / 2, cy, barW, barH, 0x1a1a1a)
            .setOrigin(0.5);
        this.add.rectangle(barX + barW / 2, cy, barW + 2, barH + 2, 0x333333)
            .setOrigin(0.5).setDepth(-1);

        this.seedBarFill = this.add.rectangle(barX, cy, barW, barH, 0xf39c12)
            .setOrigin(0, 0.5);
        this._seedBarX = barX;
        this._seedBarW = barW;
    }

    createLevelLabel(cx, y, compact) {
        this.levelText = this.add.text(cx, y + (compact ? 20 : 26), 'LEVEL 1', {
            fontFamily: 'Outfit',
            fontSize: compact ? '11px' : '14px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            resolution: TEXT_RES,
        }).setOrigin(0.5);
    }

    createScorePanel(right, y, compact) {
        const pw = compact ? 140 : 220;
        const ph = compact ? 40 : 52;
        const cx = right - pw / 2;
        const cy = y + ph / 2;
        this.add.image(cx, cy, 'hud_panel')
            .setOrigin(0.5)
            .setScale(pw / 220, ph / 52);

        this.add.image(cx - (compact ? 58 : 96), cy, 'icon_trophy').setScale(compact ? 0.7 : 0.9);

        this.scoreText = this.add.text(cx - (compact ? 42 : 74), cy, '0', {
            fontFamily: 'Outfit',
            fontSize: compact ? '14px' : '20px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);

        this.comboText = this.add.text(cx + (compact ? 30 : 50), cy, 'x1.0', {
            fontFamily: 'Outfit',
            fontSize: compact ? '10px' : '13px',
            fontStyle: 'bold',
            color: '#f1c40f',
            backgroundColor: '#1a1a1a80',
            padding: { x: 4, y: 2 },
            resolution: TEXT_RES,
        }).setOrigin(0.5).setAlpha(0.4);
    }

    createStatsBar(cx, bottom, compact) {
        const BY = bottom - (compact ? 14 : 18);
        const barScale = compact ? 0.7 : 1;
        this.add.image(cx, BY, 'hud_panel_bottom')
            .setOrigin(0.5)
            .setScale(barScale);

        const spread = compact ? 80 : 120;

        this.add.image(cx - spread, BY, 'icon_heart_green').setScale(compact ? 0.6 : 0.8);
        this.savedText = this.add.text(cx - spread + 16, BY, '0 saved', {
            fontFamily: 'Outfit',
            fontSize: compact ? '10px' : '13px',
            color: '#27ae60',
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);

        this.add.text(cx - (compact ? 12 : 20), BY, '·', {
            fontFamily: 'Outfit',
            fontSize: compact ? '12px' : '16px',
            color: '#555555',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        this.add.image(cx + (compact ? 6 : 10), BY, 'icon_heart_broken').setScale(compact ? 0.6 : 0.8);
        this.lostText = this.add.text(cx + (compact ? 22 : 28), BY, '0 lost', {
            fontFamily: 'Outfit',
            fontSize: compact ? '10px' : '13px',
            color: '#e74c3c',
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);
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
        this.savedText.setText(`${stats.railsSaved} saved`);
        this.lostText.setText(`${stats.railsLost} lost`);

        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.levelManager) {
            const progress = gameScene.levelManager.getLevelProgress();
            this.levelText.setText(`LEVEL ${progress.level} \u2013 ${progress.levelName}`);
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
