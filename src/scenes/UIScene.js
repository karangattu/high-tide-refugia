import * as Phaser from 'phaser';
import { toggleFullscreen } from '../utils/mobile.js';

const TEXT_RES = window.devicePixelRatio || 2;

export class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        const { width, height } = this.scale;
        const gameScene = this.scene.get('GameScene');
        const compact = height <= 520 || width < 650;

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
        const panelW = compact ? 165 : 320;
        const panelH = compact ? 42 : 68;
        const cx = x + panelW / 2;
        const cy = y + panelH / 2;

        this.add.image(cx, cy, 'hud_panel_wide')
            .setOrigin(0.5)
            .setScale(panelW / 260, panelH / 52);

        this.add.image(x + (compact ? 14 : 26), cy, 'seed').setScale(compact ? 0.95 : 1.5);

        this.add.text(x + (compact ? 28 : 46), y + (compact ? 5 : 10), 'SEEDS', {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '11px' : '15px',
            fontStyle: 'bold',
            color: '#f39c12',
            resolution: TEXT_RES,
        });

        this.seedsText = this.add.text(x + (compact ? 28 : 46), y + (compact ? 18 : 28), '8 / 10', {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '15px' : '24px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        });

        const barX = x + (compact ? 82 : 140);
        const barW = compact ? 74 : 160;
        const barH = compact ? 8 : 11;
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
        const panelW = compact ? 150 : 250;
        const panelH = compact ? 38 : 58;
        const cy = y + (compact ? 21 : 33);

        this.add.image(cx, cy, 'hud_flock_panel')
            .setOrigin(0.5)
            .setScale(panelW / 240, panelH / 44);

        const spread = compact ? 46 : 84;

        this.waveText = this.add.text(cx - spread, cy, 'WAVE 1/3', {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '12px' : '16px',
            fontStyle: 'bold',
            color: '#f1c40f',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        this.add.text(cx - spread / 3, cy, '·', {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '14px' : '18px',
            color: '#445544',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        this.add.image(cx - 3, cy, 'icon_heart_green').setScale(compact ? 0.55 : 0.9);
        this.savedText = this.add.text(cx + (compact ? 9 : 17), cy, '0', {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '13px' : '18px',
            fontStyle: 'bold',
            color: '#2ecc71',
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);

        this.add.text(cx + spread / 3 + 3, cy, '·', {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '14px' : '18px',
            color: '#445544',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        this.add.image(cx + spread - (compact ? 16 : 28), cy, 'icon_heart_broken').setScale(compact ? 0.55 : 0.9);
        this.lostText = this.add.text(cx + spread - (compact ? 6 : 10), cy, '0/5', {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '13px' : '18px',
            fontStyle: 'bold',
            color: '#e74c3c',
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);
    }

    createScorePanel(right, y, compact) {
        const pw = compact ? 150 : 270;
        const ph = compact ? 42 : 68;
        const cx = right - pw / 2;
        const cy = y + ph / 2;

        this.add.image(cx, cy, 'hud_panel')
            .setOrigin(0.5)
            .setScale(pw / 220, ph / 52);

        this.add.image(cx - (compact ? 54 : 104), cy, 'icon_trophy').setScale(compact ? 0.8 : 1.3);

        this.add.text(cx - (compact ? 38 : 78), y + (compact ? 5 : 10), 'POINTS', {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '10px' : '14px',
            fontStyle: 'bold',
            color: '#f1c40f',
            resolution: TEXT_RES,
        });

        this.scoreText = this.add.text(cx - (compact ? 38 : 78), y + (compact ? 16 : 27), '0', {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '15px' : '26px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        }).setOrigin(0, 0);

        this.comboText = this.add.text(cx + (compact ? 42 : 72), cy, 'x1.0', {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '11px' : '17px',
            fontStyle: 'bold',
            color: '#f1c40f',
            backgroundColor: '#1a1a1a90',
            padding: { x: compact ? 4 : 6, y: compact ? 2 : 4 },
            resolution: TEXT_RES,
        }).setOrigin(0.5).setAlpha(0.4);
    }

    createFooter(width, height, compact) {
        const footerH = compact ? 34 : 50;
        const cy = height - footerH / 2;

        this.add.image(width / 2, cy, 'hud_footer_bar')
            .setOrigin(0.5)
            .setScale(width / 960, footerH / 44);

        const leafX = compact ? 12 : 24;
        this.add.image(leafX, cy, 'icon_leaf')
            .setScale(compact ? 0.6 : 0.75)
            .setOrigin(0, 0.5);

        const brand = compact
            ? 'SF BAY REFUGE'
            : "RIDGWAY'S RAIL REFUGE";

        this.add.text(leafX + (compact ? 22 : 28), cy, brand, {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '13px' : '15px',
            fontStyle: 'bold',
            color: '#2ecc71',
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);

        if (compact) {
            const fsBtn = this.add.image(width - 18, cy, 'icon_maximize')
                .setScale(0.65)
                .setInteractive({ useHandCursor: true });
            fsBtn.on('pointerup', () => toggleFullscreen());

            this.footerTipText = this.add.text(width - 40, cy, 'Plant cover to save Rails', {
                fontFamily: 'Mona Sans',
                fontSize: '12px',
                color: '#b0c4b1',
                resolution: TEXT_RES,
            }).setOrigin(1, 0.5);
        } else {
            const fsContainer = this.add.container(width - 145, cy);
            const fsIcon = this.add.image(-48, 0, 'icon_maximize').setScale(0.6);
            const fsText = this.add.text(-34, 0, 'FULLSCREEN', {
                fontFamily: 'Mona Sans',
                fontSize: '13px',
                color: '#9fd8e8',
                resolution: TEXT_RES,
            }).setOrigin(0, 0.5);
            fsContainer.add([fsIcon, fsText]);
            fsContainer.setSize(110, 24).setInteractive({ useHandCursor: true });
            fsContainer.on('pointerup', () => toggleFullscreen());

            this.add.text(width - 26, cy, '[ESC] PAUSE', {
                fontFamily: 'Mona Sans',
                fontSize: '14px',
                color: '#65806e',
                resolution: TEXT_RES,
            }).setOrigin(1, 0.5);

            const tip = width >= 1100
                ? 'Rising King Tide · Plant Gumplant & Cordgrass corridors to guide Rails to safety'
                : 'Plant Gumplant & Cordgrass corridors to guide Rails to safety';
            this.footerTipText = this.add.text(width / 2, cy, tip, {
                fontFamily: 'Mona Sans',
                fontSize: '14px',
                color: '#b0c4b1',
                resolution: TEXT_RES,
            }).setOrigin(0.5);
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
                    fontFamily: 'Mona Sans',
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
