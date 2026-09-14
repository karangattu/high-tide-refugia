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
        const compact = height <= 520 || width < 1000;

        const PAD = compact ? 6 : 12;

        this.createSeedPanel(PAD, PAD, compact);
        this.createHeaderStatus(width / 2, PAD, compact);
        this.createTidePanel(width - PAD, PAD, compact);
        this.createFooter(width, height, compact);
        this.waveHint = this.add.text(width / 2, compact ? 61 : 88, '', {
            fontFamily: 'Mona Sans', fontSize: compact ? '11px' : '14px',
            color: '#ffffff', backgroundColor: '#10291ee8', padding: { x: 8, y: 3 },
            resolution: TEXT_RES, align: 'center', wordWrap: { width: width - 40 },
        }).setOrigin(0.5, 0);
        this.feedbackText = this.add.text(width / 2, height - (compact ? 74 : 90), '', {
            fontFamily: 'Mona Sans', fontSize: compact ? '13px' : '16px',
            color: '#ffcf9b', backgroundColor: '#17231bef', padding: { x: 10, y: 5 },
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(50).setVisible(false);
        this.placementFeedback = reason => {
            this.feedbackText.setText(reason).setVisible(true);
            this.feedbackTimer?.remove();
            this.feedbackTimer = this.time.delayedCall(1600, () => this.feedbackText.setVisible(false));
        };
        gameScene.events.on('placementFeedback', this.placementFeedback);
        this.updateSeedBank(gameScene.seedBank.currentSeeds, gameScene.seedBank.maxSeeds);
        this.updateStats(gameScene.scoreManager.getStats());
        this.updateScore(gameScene.scoreManager.score, gameScene.scoreManager.comboMultiplier);

        gameScene.events.on('seedsUpdate', this.updateSeedBank, this);
        gameScene.events.on('scoreUpdate', this.updateScore, this);
        gameScene.events.on('statsUpdate', this.updateStats, this);
        gameScene.events.on('pauseToggle', this.togglePauseOverlay, this);

        this.events.on('shutdown', () => {
            gameScene.events.off('placementFeedback', this.placementFeedback);
            gameScene.events.off('seedsUpdate', this.updateSeedBank, this);
            gameScene.events.off('scoreUpdate', this.updateScore, this);
            gameScene.events.off('statsUpdate', this.updateStats, this);
            gameScene.events.off('pauseToggle', this.togglePauseOverlay, this);
        });
    }

    createSeedPanel(x, y, compact) {
        const panelW = this.scale.width * 0.25 - x - 8;
        const panelH = compact ? 42 : 68;
        const cx = x + panelW / 2;
        const cy = y + panelH / 2;

        this.add.image(cx, cy, 'hud_panel_wide')
            .setOrigin(0.5)
            .setScale(panelW / 260, panelH / 52);

        this.add.image(x + (compact ? 14 : 26), cy, 'seed').setScale(compact ? 0.062 : 0.09);

        this.seedLabel = this.add.text(x + (compact ? 28 : 46), y + (compact ? 5 : 10), 'SEEDS', {
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

        const barX = x + (compact ? 90 : 150);
        const barW = Math.max(10, panelW - (barX - x) - 12);
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
        const panelW = this.scale.width * 0.5 - 16;
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
            cx - panelW * 0.25, counterY, 'icon_heart_green', 'AT RISK',
            '#2ecc71', '#79c9a0', '0', compact, heartScale
        );
        this.savedText = savedGroup.value;

        const lostGroup = this.createHudCounter(
            cx + panelW * 0.25, counterY, 'icon_heart_broken', 'LEFT',
            '#e74c3c', '#e0918b', '6', compact, heartScale
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
            const profile = gameScene.levelManager.getWaveProfile();
            this.waveText.setText(gameScene.tutorialActive ? 'PRACTICE' : `WAVE ${Math.min(Math.max(wave, 1), total)} / ${total} · ${profile.name.toUpperCase()}`);
            this.waveText.setScale(Math.min(1, (this.scale.width * 0.5 - 30) / this.waveText.width));
            this.waveHint?.setText(gameScene.tutorialActive
                ? 'Touch: drag to aim above your finger, release to plant'
                : profile.hint);
        }
        if (this.savedText) {
            const active = gameScene.rails.children.entries.filter(r => r.isAlive && !r.hasReachedSafety).length;
            this.savedText.setText(String(active));
        }
        if (this.tideText) {
            const remaining = Math.max(0, gameScene.safeZoneX - 50 - gameScene.waterSystem.getWaterX());
            const speed = gameScene.waterSystem.currentSpeed;
            const seconds = speed > 0 ? Math.ceil(remaining / speed) : null;
            const held = gameScene.tutorialActive || gameScene.waveStarting || !speed;
            this.tideText.setText(held ? 'HELD' : `~${seconds}s`);
            this.tideText.setColor(!held && seconds < 20 ? '#ff9d8c' : '#ffffff');
            this.tideLabel.setText(held ? 'TIDE' : seconds < 20 ? 'REFUGE IN DANGER' : 'UNTIL REFUGE FLOODS');
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

    createTidePanel(right, y, compact) {
        const pw = this.scale.width * 0.25 - (this.scale.width - right) - 8;
        const ph = compact ? 42 : 68;
        const cx = right - pw / 2;
        this.add.image(cx, y + ph / 2, 'hud_panel').setScale(pw / 220, ph / 52);
        this.tideLabel = this.add.text(cx, y + (compact ? 7 : 12), 'UNTIL REFUGE FLOODS', {
            fontFamily: 'Mona Sans', fontSize: compact ? '9px' : '12px', color: '#9fd8e8', resolution: TEXT_RES,
        }).setOrigin(0.5, 0);
        this.tideText = this.add.text(cx, y + (compact ? 18 : 29), 'HELD', {
            fontFamily: 'Mona Sans', fontSize: compact ? '18px' : '26px', fontStyle: 'bold', color: '#ffffff', resolution: TEXT_RES,
        }).setOrigin(0.5, 0);
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

        const brandText = this.add.text(leafX + (compact ? 22 : 28), cy, '0 PTS', {
            fontFamily: 'Mona Sans', fontSize: compact ? '11px' : '13px',
            color: '#b0c4b1', resolution: TEXT_RES,
        }).setOrigin(0, 0.5);
        this.scoreText = brandText;
        const gameScene = this.scene.get('GameScene');
        const button = (x, width, label, callback) => {
            const control = this.add.text(x, height - 22, label, {
                fontFamily: 'Mona Sans', fontSize: compact ? '11px' : '13px',
                color: '#e2f3e8', backgroundColor: '#173629',
                fixedWidth: width, fixedHeight: 44, align: 'center', padding: { top: 14 }, resolution: TEXT_RES,
            }).setOrigin(0.5).setDepth(205).setInteractive({ useHandCursor: true });
            control.on('pointerdown', (_p, _x, _y, event) => event.stopPropagation());
            control.on('pointerup', (_p, _x, _y, event) => {
                event.stopPropagation();
                gameScene.touchPlantPointer = null;
                gameScene.plantPreview.hide();
                callback();
            });
            return control;
        };
        this.pauseButton = button(width - 37, 68, 'PAUSE', () => gameScene.togglePause());
        this.motionButton = button(width - 135, 120, gameScene.reducedMotion ? 'MOTION: LOW' : 'MOTION: FULL', () => {
            gameScene.reducedMotion = !gameScene.reducedMotion;
            this.motionButton.setText(gameScene.reducedMotion ? 'MOTION: LOW' : 'MOTION: FULL');
        });
        button(width - 233, 68, 'EXPAND', () => toggleFullscreen());
        const tickerEndX = width - 277;

        const tickerStartX = compact ? 190 : 240;
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
            if (!this._lowPulsing && !this.scene.get('GameScene').reducedMotion) {
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
        this.scoreText.setText(`${Math.round(score)} PTS${comboMultiplier > 1 ? ` · ×${comboMultiplier.toFixed(1)}` : ''}`);
    }

    updateStats(stats) {
        if (this.lostText) this.lostText.setText(`${Math.max(0, 7 - stats.railsLost)}`);
        if (this.seedLabel) this.seedLabel.setText('SEEDS');

        this.refreshWaveProgress();
    }

    togglePauseOverlay(isPaused) {
        this.pauseButton.setText(isPaused ? 'RESUME' : 'PAUSE');
        if (isPaused) {
            this.pauseOverlay = this.add.rectangle(
                this.scale.width / 2,
                this.scale.height / 2,
                this.scale.width,
                this.scale.height,
                0x000000, 0.7
            ).setDepth(200).setInteractive();
            for (const eventName of ['pointerdown', 'pointerup']) {
                this.pauseOverlay.on(eventName, (_p, _x, _y, event) => event.stopPropagation());
            }

            this.pauseText = this.add.text(
                this.scale.width / 2,
                this.scale.height / 2,
                'PAUSED\n\nTap RESUME or press ESC',
                {
                    fontFamily: 'Mona Sans',
                    fontSize: this.scale.height <= 520 ? '26px' : '40px',
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

        const gameScene = this.scene.get('GameScene');
        if (gameScene.isPaused || gameScene.reducedMotion) return;
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
