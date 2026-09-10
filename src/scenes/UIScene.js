import * as Phaser from 'phaser';
import { toggleFullscreen } from '../utils/mobile.js';
import { AUTHENTIC_MARSH_FACTS } from '../data/marshFacts.js';

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
        const panelW = compact ? 175 : 300;
        const panelH = compact ? 48 : 64;
        const cy = y + panelH / 2;

        this.add.image(cx, cy, 'hud_flock_panel')
            .setOrigin(0.5)
            .setScale(panelW / 240, panelH / 44);

        // Wave label
        this.waveText = this.add.text(cx, y + (compact ? 11 : 15), 'WAVE 1 / 8', {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '12px' : '17px',
            fontStyle: 'bold',
            color: '#f1c40f',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        // Segmented wave progress bar
        const barW = panelW - (compact ? 32 : 52);
        const barH = compact ? 7 : 10;
        const barY = y + (compact ? 23 : 33);
        this._waveBar = { x: cx - barW / 2, y: barY, w: barW, h: barH };
        this.waveBarGraphics = this.add.graphics();

        // Labeled counters
        const heartScale = compact ? 0.5 : 0.75;
        const counterY = y + (compact ? 38 : 52);

        const savedGroup = this.createHudCounter(
            cx - panelW * 0.25, counterY, 'icon_heart_green', 'SAVED',
            '#2ecc71', '#79c9a0', '0', compact, heartScale
        );
        this.savedText = savedGroup.value;

        const lostGroup = this.createHudCounter(
            cx + panelW * 0.25, counterY, 'icon_heart_broken', 'LOST',
            '#e74c3c', '#e0918b', '0/5', compact, heartScale
        );
        this.lostText = lostGroup.value;

        this.refreshWaveProgress();
    }

    createHudCounter(centerX, centerY, iconKey, label, valueColor, labelColor, initialValue, compact, heartScale) {
        const gap = compact ? 4 : 7;
        const icon = this.add.image(0, 0, iconKey).setScale(heartScale);
        const iconHalf = icon.displayWidth / 2;

        const value = this.add.text(iconHalf + gap, 0, initialValue, {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '13px' : '18px',
            fontStyle: 'bold',
            color: valueColor,
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);

        const caption = this.add.text(value.x + value.width + gap, 0, label, {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '9px' : '11px',
            fontStyle: 'bold',
            color: labelColor,
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);

        const contentLeft = -iconHalf;
        const contentRight = caption.x + caption.width;
        const container = this.add.container(
            centerX - (contentLeft + contentRight) / 2,
            centerY,
            [icon, value, caption]
        );

        return { container, value };
    }

    refreshWaveProgress() {
        if (!this.waveBarGraphics || !this._waveBar) return;

        const gameScene = this.scene.get('GameScene');
        if (!gameScene || !gameScene.levelManager) return;

        const progress = gameScene.levelManager.getLevelProgress();
        const total = Math.max(1, progress.totalWaves || 1);
        const wave = progress.wave || 0;
        const spawnFrac = progress.railsToSpawn > 0
            ? Phaser.Math.Clamp(progress.railsSpawned / progress.railsToSpawn, 0, 1)
            : 0;

        if (this.waveText) {
            this.waveText.setText(`WAVE ${Math.min(Math.max(wave, 1), total)} / ${total}`);
        }

        const { x, y, w, h } = this._waveBar;
        const radius = h / 2;
        const gap = 2;
        const segW = (w - gap * (total - 1)) / total;
        const g = this.waveBarGraphics;
        g.clear();

        g.fillStyle(0x14301f, 1);
        g.fillRoundedRect(x, y - h / 2, w, h, radius);

        for (let i = 0; i < total; i++) {
            const sx = x + i * (segW + gap);

            g.fillStyle(0x244636, 1);
            g.fillRoundedRect(sx, y - h / 2, segW, h, Math.min(segW, h) / 2);

            let frac = 0;
            if (i < wave - 1) frac = 1;
            else if (i === wave - 1) frac = spawnFrac;

            if (frac > 0) {
                g.fillStyle(frac >= 1 ? 0x2ecc71 : 0xf1c40f, 1);
                g.fillRoundedRect(sx, y - h / 2, Math.max(segW * frac, radius), h, Math.min(segW, h) / 2);
            }
        }

        g.lineStyle(1, 0xffffff, 0.12);
        g.strokeRoundedRect(x, y - h / 2, w, h, radius);
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

        const brandText = this.add.text(leafX + (compact ? 22 : 28), cy, brand, {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '13px' : '15px',
            fontStyle: 'bold',
            color: '#2ecc71',
            resolution: TEXT_RES,
        }).setOrigin(0, 0.5);

        let tickerEndX = width - 40;
        if (compact) {
            const fsBtn = this.add.image(width - 18, cy, 'icon_maximize')
                .setScale(0.65)
                .setInteractive({ useHandCursor: true });
            fsBtn.on('pointerup', () => toggleFullscreen());
            tickerEndX = width - 36;
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

            tickerEndX = width - 215;
        }

        const tickerStartX = brandText.x + (brandText.width || (compact ? 95 : 180)) + (compact ? 12 : 20);
        const trackW = tickerEndX - tickerStartX;

        if (trackW > 70) {
            this.tickerFacts = AUTHENTIC_MARSH_FACTS.map(f => f.ticker);
            this.tickerFactIndex = 0;
            this.tickerStartX = tickerStartX;
            this.tickerSpeed = compact ? 42 : 52;
            this.tickerItems = [];

            const maskGraphics = this.make.graphics();
            maskGraphics.fillStyle(0xffffff);
            maskGraphics.fillRect(tickerStartX, cy - footerH / 2, trackW, footerH);
            this.tickerMask = maskGraphics.createGeometryMask();

            let cursorX = tickerStartX;
            while (cursorX < tickerStartX + trackW + 600) {
                const factText = this.tickerFacts[this.tickerFactIndex] + '    ◆    ';
                this.tickerFactIndex = (this.tickerFactIndex + 1) % this.tickerFacts.length;

                const item = this.add.text(cursorX, cy, factText, {
                    fontFamily: 'Mona Sans',
                    fontSize: compact ? '11px' : '13px',
                    color: '#b0c4b1',
                    resolution: TEXT_RES,
                }).setOrigin(0, 0.5).setMask(this.tickerMask);

                this.tickerItems.push(item);
                cursorX += item.width;
            }

            this.events.on('shutdown', () => {
                if (maskGraphics) {
                    maskGraphics.destroy();
                }
            });
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

        this.refreshWaveProgress();
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

    update(time, delta) {
        this.refreshWaveProgress();

        if (this.tickerItems && this.tickerItems.length > 0) {
            const dt = delta / 1000;
            const shift = this.tickerSpeed * dt;

            for (let i = 0; i < this.tickerItems.length; i++) {
                this.tickerItems[i].x -= shift;
            }

            const first = this.tickerItems[0];
            if (first.x + first.width < this.tickerStartX) {
                this.tickerItems.shift();
                const last = this.tickerItems[this.tickerItems.length - 1];
                const nextFact = this.tickerFacts[this.tickerFactIndex] + '    ◆    ';
                this.tickerFactIndex = (this.tickerFactIndex + 1) % this.tickerFacts.length;

                first.setText(nextFact);
                first.x = last.x + last.width;
                this.tickerItems.push(first);
            }
        }
    }
}
