import * as Phaser from 'phaser';
import {
    getSavedPlayerName,
    fetchTopScores,
    submitHighScore,
    subscribeToLeaderboard,
    normalizeName,
} from '../systems/HighScoreManager.js';
import { getNameEntryLayout } from '../ui/nameEntryLayout.js';
import { getGameOverLayoutMode, getOrientationAxis } from '../ui/orientationLayout.js';
import { canApplyAsyncRender, nextRenderGeneration } from '../ui/asyncRenderGuard.js';

const TEXT_RES = window.devicePixelRatio || 2;

export class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.stats = data.stats || {};
        this.reason = data.reason || 'Game Over';
        this.level = data.level || 1;
        this.victory = data.victory || false;
        this.pendingPlayerName = data.pendingPlayerName || '';
        this.habitat = data.habitat || null;
    }

    create() {
        const { width, height } = this.scale;
        this.renderGeneration = nextRenderGeneration(this.renderGeneration);
        this.leaderboardSlots = [];
        this.lbStatusText = null;
        this.orientationAxis = getOrientationAxis(
            window.screen?.orientation?.type,
            width,
            height
        );

        this.createBackground(width, height);
        this.createPanel(width, height);
        this.setupLeaderboard();
        this.onOrientationSettled = () => this.handleOrientationSettled();
        window.addEventListener('refugia:orientation-settled', this.onOrientationSettled);
        this.events.once('shutdown', () => {
            window.removeEventListener('refugia:orientation-settled', this.onOrientationSettled);
            this.onOrientationSettled = null;
        });
        this.cameras.main.fadeIn(500);
    }

    handleOrientationSettled() {
        const nextAxis = getOrientationAxis(
            window.screen?.orientation?.type,
            window.innerWidth,
            window.innerHeight
        );
        if (nextAxis === this.orientationAxis) return;

        this.pendingPlayerName = this.nameInput?.value || this.pendingPlayerName;
        this.scene.restart({
            stats: this.stats,
            reason: this.reason,
            level: this.level,
            victory: this.victory,
            pendingPlayerName: this.pendingPlayerName,
        });
    }

    setupLeaderboard() {
        this.refreshLeaderboard();

        // Refetch when anyone submits from any client (realtime)
        this.unsubscribeLeaderboard = subscribeToLeaderboard(() => {
            this.refreshLeaderboard();
        });

        // Returning player (name saved from a previous run): keep their entry current
        if (getSavedPlayerName() && (this.stats.score || 0) > 0) {
            this.handleSubmitName(null, true);
        }

        this.events.once('shutdown', () => {
            if (this.unsubscribeLeaderboard) {
                this.unsubscribeLeaderboard();
                this.unsubscribeLeaderboard = null;
            }
            this.removeNameForm();
        });
    }

    async refreshLeaderboard() {
        if (!this.leaderboardSlots || !this.leaderboardSlots.length) return;
        const requestGeneration = this.renderGeneration;

        try {
            const rows = await fetchTopScores(5);
            if (!canApplyAsyncRender(requestGeneration, this.renderGeneration, this.sys.isActive())) return;

            if (!rows.length) {
                this.leaderboardSlots.forEach(slot => {
                    slot.nameText.setText('-');
                    slot.scoreText.setText('');
                    slot.rankText.setText(`${slot.index + 1}.`);
                });
                if (this.lbStatusText) this.lbStatusText.setText('No scores yet - be the first!');
                return;
            }

            this.leaderboardSlots.forEach(slot => {
                const row = rows[slot.index];
                if (row) {
                    const name = String(row.player_name || '');
                    slot.nameText.setText(name.length > 12 ? `${name.slice(0, 11)}…` : name);
                    slot.scoreText.setText(String(row.score ?? 0));
                    slot.nameText.setColor(slot.index === 0 ? '#f1c40f' : '#ffffff');
                    slot.rankText.setText(`${slot.index + 1}.`);
                } else {
                    slot.nameText.setText('-');
                    slot.scoreText.setText('');
                    slot.rankText.setText('');
                }
            });
            if (this.lbStatusText) this.lbStatusText.setText('LIVE - updates in realtime');
        } catch {
            if (!canApplyAsyncRender(requestGeneration, this.renderGeneration, this.sys.isActive())) return;
            if (this.lbStatusText) this.lbStatusText.setText('Leaderboard unavailable');
        }
    }

    renderLeaderboardRows(topY, spacing, fontPx, rankX, nameX, scoreX) {
        (this.leaderboardSlots || []).forEach(slot => {
            slot.rankText.destroy();
            slot.nameText.destroy();
            slot.scoreText.destroy();
        });
        this.leaderboardSlots = [];

        for (let i = 0; i < 5; i++) {
            const y = topY + i * spacing;

            const rankText = this.add.text(rankX, y, `${i + 1}.`, {
                fontFamily: 'Mona Sans',
                fontSize: `${fontPx}px`,
                fontStyle: 'bold',
                color: '#f39c12',
                resolution: TEXT_RES,
            }).setOrigin(0, 0.5).setDepth(12);

            const nameText = this.add.text(nameX, y, '...', {
                fontFamily: 'Mona Sans',
                fontSize: `${fontPx}px`,
                color: '#ffffff',
                resolution: TEXT_RES,
            }).setOrigin(1, 0.5).setDepth(12);

            const scoreText = this.add.text(scoreX, y, '', {
                fontFamily: 'Mona Sans',
                fontSize: `${fontPx}px`,
                fontStyle: 'bold',
                color: '#e67e22',
                resolution: TEXT_RES,
            }).setOrigin(1, 0.5).setDepth(12);

            this.leaderboardSlots.push({ index: i, rankText, nameText, scoreText });
        }
    }

    async handleSubmitName(inputEl, silent = false) {
        const rawName = inputEl ? inputEl.value : getSavedPlayerName();
        const stats = this.stats || { score: 0, railsSaved: 0, railsLost: 0 };
        const requestGeneration = this.renderGeneration;

        if (!silent) {
            if (normalizeName(rawName).length < 2) {
                if (this.lbStatusText) this.lbStatusText.setText('Name needs 2+ characters');
                return;
            }
            if (this.lbStatusText) this.lbStatusText.setText('Submitting...');
        }

        try {
            await submitHighScore(rawName, stats);
            if (!canApplyAsyncRender(requestGeneration, this.renderGeneration, this.sys.isActive())) return;
            if (this.lbStatusText) this.lbStatusText.setText(`Best score saved for ${normalizeName(rawName)}`);
            await this.refreshLeaderboard();
        } catch {
            if (!canApplyAsyncRender(requestGeneration, this.renderGeneration, this.sys.isActive())) return;
            if (this.lbStatusText) this.lbStatusText.setText('Could not save score');
        }
    }

    createBackground(width, height) {
        this.add.rectangle(width / 2, height / 2, width, height, 0x0d1f2d, 1);

        for (let x = 0; x < width; x += 64) {
            this.add.image(x + 32, height - 32, 'water').setAlpha(0.3);
        }
    }

    getHeaderInfo() {
        if (this.victory) {
            const perfect = (this.stats.railsLost || 0) === 0;
            return {
                titleText: perfect ? 'PERFECT REFUGE!' : 'TIDE SURVIVED!',
                titleColor: '#2ecc71',
                borderColor: 0x27ae60,
                subText: perfect
                    ? 'Flawless restoration! All rails reached safety.'
                    : (this.reason && this.reason !== 'Game Over'
                        ? this.reason
                        : 'You guided the rails safely to high-tide refugia!'),
                buttonText: 'PLAY AGAIN',
            };
        }

        const isWaterLoss = this.reason && (
            this.reason.toLowerCase().includes('tide') ||
            this.reason.toLowerCase().includes('water') ||
            this.reason.toLowerCase().includes('submerge')
        );

        if (isWaterLoss) {
            return {
                titleText: 'REFUGE FLOODED',
                titleColor: '#e74c3c',
                borderColor: 0xc0392b,
                subText: 'The king tide rose too high before enough rails reached safety.',
                buttonText: 'TRY AGAIN',
            };
        }

        return {
            titleText: 'TOO MANY RAILS LOST',
            titleColor: '#e74c3c',
            borderColor: 0xc0392b,
            subText: 'Place a few patches along rail routes so birds can duck into cover.',
            buttonText: 'TRY AGAIN',
        };
    }

    /**
     * Conservation breakdown shown after every run: species diversity, the
     * grade of the habitat corridor, and how many rails beat the tide.
     */
    getHabitatRows() {
        if (!this.habitat) return [];
        const h = this.habitat;
        const connected = Boolean(h.corridorConnected);
        const grade = h.corridorGrade || 'D';
        const gradeColor = connected ? '#2ecc71' : (grade === 'B' ? '#f1c40f' : '#e74c3c');
        return [
            { label: 'Native Diversity', value: `${h.speciesCount || 0}/${h.speciesTotal || 5} species`, color: '#2ecc71' },
            { label: 'Refugia Corridor', value: connected ? `${grade} Corridor` : `${grade} Frayed`, color: gradeColor },
            { label: 'Tide Survival', value: `${Math.round((h.tideSurvivalRate || 0) * 100)}%`, color: '#9fd8e8' },
        ];
    }

    createPanel(width, height) {
        const isLandscape = getGameOverLayoutMode(width, height) === 'landscape';
        const compact = height <= 520 || width < 680;

        if (isLandscape) {
            const panelW = Math.min(compact ? 880 : 1010, width - 30);
            const panelH = Math.min(compact ? 320 : 380, height - 20);
            const panelX = width / 2 - panelW / 2;
            const panelY = Math.max(10, (height - panelH) / 2);

            const header = this.getHeaderInfo();

            const panel = this.add.graphics();
            panel.fillStyle(0x1a2a1a, 0.95);
            panel.fillRoundedRect(panelX, panelY, panelW, panelH, 20);
            panel.lineStyle(2, header.borderColor, 0.6);
            panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 20);

            const col1X = panelX + panelW * 0.22;
            const col2X = panelX + panelW * 0.55;
            const col3X = panelX + panelW * 0.86;

            const titleFontSize = header.titleText.length > 15 ? (compact ? '22px' : '26px') : (compact ? '28px' : '32px');
            this.add.text(col1X, panelY + (compact ? 34 : 44), header.titleText, {
                fontFamily: 'Mona Sans',
                fontSize: titleFontSize,
                fontStyle: 'bold',
                color: header.titleColor,
                resolution: TEXT_RES,
            }).setOrigin(0.5);

            this.add.text(col1X, panelY + (compact ? 64 : 80), header.subText, {
                fontFamily: 'Mona Sans',
                fontSize: compact ? '13px' : '15px',
                color: '#aaaaaa',
                wordWrap: { width: panelW * 0.30 },
                align: 'center',
                lineSpacing: 3,
                resolution: TEXT_RES,
            }).setOrigin(0.5);

            this.add.text(col1X, panelY + (compact ? 98 : 124), 'FINAL SCORE', {
                fontFamily: 'Mona Sans',
                fontSize: compact ? '13px' : '15px',
                color: '#f39c12',
                resolution: TEXT_RES,
            }).setOrigin(0.5);

            const scoreText = this.add.text(col1X, panelY + (compact ? 138 : 172), this.stats.score?.toString() || '0', {
                fontFamily: 'Mona Sans',
                fontSize: compact ? '44px' : '56px',
                fontStyle: 'bold',
                color: '#ffffff',
                resolution: TEXT_RES,
            }).setOrigin(0.5);

            this.tweens.addCounter({
                from: 0,
                to: this.stats.score || 0,
                duration: 1500,
                ease: 'Power2',
                onUpdate: (tween) => {
                    scoreText.setText(Math.floor(tween.getValue()).toString());
                }
            });

            const survivalRate = this.stats.survivalRate ? Math.round(this.stats.survivalRate * 100) : 0;
            this.add.text(col1X, panelY + (compact ? 185 : 230), `${survivalRate}% Survival Rate`, {
                fontFamily: 'Mona Sans',
                fontSize: compact ? '15px' : '18px',
                color: survivalRate >= 50 ? '#27ae60' : '#e74c3c',
                resolution: TEXT_RES,
            }).setOrigin(0.5);

            const statsData = [
                { icon: 'icon_heart_green', label: 'Rails Saved', value: this.stats.railsSaved || 0, color: '#27ae60' },
                { icon: 'icon_heart_broken', label: 'Rails Lost', value: this.stats.railsLost || 0, color: '#e74c3c' },
                { icon: 'icon_leaf', label: 'Smart Saves', value: this.stats.strategicSaves || 0, color: '#f1c40f' },
                { icon: 'icon_flame', label: 'Max Combo', value: this.stats.maxCombo || 0, color: '#e67e22' },
            ];

            const statsY = panelY + (compact ? 36 : 46);
            const statsSpacing = compact ? 36 : 44;
            statsData.forEach((stat, i) => {
                const y = statsY + i * statsSpacing;
                this.add.image(col2X - (compact ? 85 : 100), y, stat.icon).setScale(compact ? 0.8 : 0.95);
                this.add.text(col2X - (compact ? 60 : 70), y, stat.label, {
                    fontFamily: 'Mona Sans',
                    fontSize: compact ? '15px' : '17px',
                    color: '#aaaaaa',
                    resolution: TEXT_RES,
                }).setOrigin(0, 0.5);
                this.add.text(col2X + (compact ? 85 : 100), y, stat.value.toString(), {
                    fontFamily: 'Mona Sans',
                    fontSize: compact ? '18px' : '22px',
                    fontStyle: 'bold',
                    color: stat.color,
                    resolution: TEXT_RES,
                }).setOrigin(0.5);
            });

            const habitatRows = this.getHabitatRows();
            if (habitatRows.length) {
                const hHeaderY = statsY + statsData.length * statsSpacing + (compact ? 2 : 6);
                this.add.text(col2X, hHeaderY, 'HABITAT REPORT', {
                    fontFamily: 'Mona Sans',
                    fontSize: compact ? '12px' : '14px',
                    fontStyle: 'bold',
                    color: '#27ae60',
                    resolution: TEXT_RES,
                }).setOrigin(0.5);

                habitatRows.forEach((row, i) => {
                    const ry = hHeaderY + (compact ? 18 : 22) + i * (compact ? 16 : 18);
                    this.add.text(col2X - (compact ? 92 : 108), ry, row.label, {
                        fontFamily: 'Mona Sans',
                        fontSize: compact ? '11px' : '13px',
                        color: '#8fa895',
                        resolution: TEXT_RES,
                    }).setOrigin(0, 0.5);
                    this.add.text(col2X + (compact ? 92 : 108), ry, row.value, {
                        fontFamily: 'Mona Sans',
                        fontSize: compact ? '11px' : '13px',
                        fontStyle: 'bold',
                        color: row.color,
                        resolution: TEXT_RES,
                    }).setOrigin(1, 0.5);
                });
            }

            const buttonY = panelY + panelH - (compact ? 42 : 50);

            this.createButton(panelX + panelW * 0.26, buttonY, header.buttonText, () => {
                this.cameras.main.fadeOut(300);
                this.time.delayedCall(300, () => {
                    this.scene.start('GameScene');
                    this.scene.launch('UIScene');
                });
            }, false, compact ? 140 : 160, compact ? 42 : 48);

            this.createButton(panelX + panelW * 0.50, buttonY, 'MENU', () => {
                this.cameras.main.fadeOut(300);
                this.time.delayedCall(300, () => {
                    this.scene.start('MenuScene');
                });
            }, true, compact ? 120 : 140, compact ? 42 : 48);

            this.add.text(col3X, panelY + (compact ? 30 : 38), 'LEADERBOARD', {
                fontFamily: 'Mona Sans',
                fontSize: compact ? '16px' : '20px',
                fontStyle: 'bold',
                color: '#f39c12',
                resolution: TEXT_RES,
            }).setOrigin(0.5).setDepth(12);

            const rowsTopY = panelY + (compact ? 68 : 84);
            const rowsSpacing = compact ? 32 : 38;
            this.renderLeaderboardRows(
                rowsTopY,
                rowsSpacing,
                compact ? 14 : 16,
                col3X - 104,
                col3X + 38,
                col3X + 102
            );

            const formCy = panelY + panelH - (compact ? 26 : 30);
            this.lbStatusText = this.add.text(col3X, formCy - (compact ? 46 : 52), '', {
                fontFamily: 'Mona Sans',
                fontSize: compact ? '11px' : '12px',
                color: '#9fd8e8',
                resolution: TEXT_RES,
            }).setOrigin(0.5).setDepth(12);
            this.add.text(col3X, formCy - (compact ? 24 : 27), 'ONE ENTRY PER NAME', {
                fontFamily: 'Mona Sans',
                fontSize: compact ? '10px' : '12px',
                color: '#65806e',
                resolution: TEXT_RES,
            }).setOrigin(0.5).setDepth(12);
            this.createNameEntry(col3X, formCy, compact);

            return;
        }

        const panelW = Math.min(580, width - 30);
        const panelH = Math.min(680, height - 30);
        const panelX = width / 2 - panelW / 2;
        const panelY = Math.max(15, (height - panelH) / 2);

        const header = this.getHeaderInfo();

        const panel = this.add.graphics();
        panel.fillStyle(0x1a2a1a, 0.95);
        panel.fillRoundedRect(panelX, panelY, panelW, panelH, 24);
        panel.lineStyle(3, header.borderColor, 0.6);
        panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 24);

        const titleFontSize = compact
            ? (header.titleText.length > 15 ? '30px' : '38px')
            : (header.titleText.length > 15 ? '42px' : '52px');

        this.add.text(width / 2, panelY + (compact ? 46 : 58), header.titleText, {
            fontFamily: 'Mona Sans',
            fontSize: titleFontSize,
            fontStyle: 'bold',
            color: header.titleColor,
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        this.add.text(width / 2, panelY + (compact ? 90 : 116), header.subText, {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '15px' : '19px',
            color: '#aaaaaa',
            wordWrap: { width: panelW - 40 },
            align: 'center',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        this.add.text(width / 2, panelY + (compact ? 132 : 192), 'FINAL SCORE', {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '16px' : '20px',
            color: '#f39c12',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        const scoreText = this.add.text(width / 2, panelY + (compact ? 172 : 248), this.stats.score?.toString() || '0', {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '54px' : '80px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        this.tweens.addCounter({
            from: 0,
            to: this.stats.score || 0,
            duration: 1500,
            ease: 'Power2',
            onUpdate: (tween) => {
                scoreText.setText(Math.floor(tween.getValue()).toString());
            }
        });

        const statsY = panelY + (compact ? 228 : 330);
        const statsSpacing = compact ? 36 : 48;
        const statsData = [
            { icon: 'icon_heart_green', label: 'Rails Saved', value: this.stats.railsSaved || 0, color: '#27ae60' },
            { icon: 'icon_heart_broken', label: 'Rails Lost', value: this.stats.railsLost || 0, color: '#e74c3c' },
            { icon: 'icon_leaf', label: 'Smart Saves', value: this.stats.strategicSaves || 0, color: '#f1c40f' },
            { icon: 'icon_flame', label: 'Max Combo', value: this.stats.maxCombo || 0, color: '#e67e22' },
        ];

        statsData.forEach((stat, i) => {
            const y = statsY + i * statsSpacing;

            this.add.image(width / 2 - (compact ? 90 : 120), y, stat.icon).setScale(compact ? 0.85 : 1.1);

            this.add.text(width / 2 - (compact ? 64 : 88), y, stat.label, {
                fontFamily: 'Mona Sans',
                fontSize: compact ? '17px' : '21px',
                color: '#aaaaaa',
                resolution: TEXT_RES,
            }).setOrigin(0, 0.5);

            this.add.text(width / 2 + (compact ? 90 : 120), y, stat.value.toString(), {
                fontFamily: 'Mona Sans',
                fontSize: compact ? '20px' : '26px',
                fontStyle: 'bold',
                color: stat.color,
                resolution: TEXT_RES,
            }).setOrigin(0.5);
        });

        const survivalRate = this.stats.survivalRate ? Math.round(this.stats.survivalRate * 100) : 0;
        const survivalY = Math.max(statsY + statsData.length * statsSpacing + (compact ? 12 : 20), panelY + panelH - (compact ? 104 : 116));
        this.add.text(width / 2, survivalY, `${survivalRate}% Survival Rate`, {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '18px' : '24px',
            color: survivalRate >= 50 ? '#27ae60' : '#e74c3c',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        if (this.habitat) {
            const h = this.habitat;
            const connected = Boolean(h.corridorConnected);
            const grade = h.corridorGrade || 'D';
            const tidePct = Math.round((h.tideSurvivalRate || 0) * 100);
            const report = `HABITAT:  ${h.speciesCount || 0}/${h.speciesTotal || 5} species  ·  Corridor ${grade}  ·  Tide ${tidePct}%`;
            this.add.text(width / 2, survivalY + (compact ? 22 : 28), report, {
                fontFamily: 'Mona Sans',
                fontSize: compact ? '11px' : '13px',
                fontStyle: 'bold',
                color: connected ? '#9be29b' : '#f1c40f',
                resolution: TEXT_RES,
            }).setOrigin(0.5);
        }

        const lbHeaderY = statsY + (statsData.length - 1) * statsSpacing + (compact ? 46 : 58);
        const lbRowsTop = lbHeaderY + (compact ? 26 : 30);
        const lbRowSpacing = compact ? 20 : 23;
        const lbRowsBottom = lbRowsTop + 4 * lbRowSpacing;
        const lbFormCy = lbRowsBottom + (compact ? 60 : 66);

        if (lbHeaderY < survivalY - 40 && lbRowsBottom < survivalY - 12) {
            this.add.text(width / 2, lbHeaderY, 'LEADERBOARD', {
                fontFamily: 'Mona Sans',
                fontSize: compact ? '14px' : '16px',
                fontStyle: 'bold',
                color: '#f39c12',
                resolution: TEXT_RES,
            }).setOrigin(0.5).setDepth(12);

            this.renderLeaderboardRows(
                lbRowsTop,
                lbRowSpacing,
                compact ? 12 : 14,
                width / 2 - 105,
                width / 2 + 34,
                width / 2 + 105
            );

            if (lbFormCy < survivalY - 6) {
                const lbStatusY = lbRowsBottom + (compact ? 16 : 18);
                this.lbStatusText = this.add.text(width / 2, lbStatusY, '', {
                    fontFamily: 'Mona Sans',
                    fontSize: compact ? '10px' : '11px',
                    color: '#9fd8e8',
                    resolution: TEXT_RES,
                }).setOrigin(0.5).setDepth(12);
                this.createNameEntry(width / 2, lbFormCy, compact);
            }
        }

        const buttonY = Math.max(survivalY + (compact ? 46 : 56), panelY + panelH - (compact ? 50 : 58));
        const btnSpread = compact ? 100 : 140;

        this.createButton(width / 2 - btnSpread, buttonY, header.buttonText, () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => {
                this.scene.start('GameScene');
                this.scene.launch('UIScene');
            });
        });

        this.createButton(width / 2 + btnSpread, buttonY, 'MENU', () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => {
                this.scene.start('MenuScene');
            });
        }, true);
    }

    createButton(x, y, text, callback, isSecondary = false, customW = null, customH = null) {
        const compact = this.scale.height <= 520 || this.scale.width < 600;
        const btnW = customW || (compact ? 160 : 200);
        const btnH = customH || (compact ? 48 : 58);

        const bg = this.add.graphics();
        if (isSecondary) {
            bg.fillStyle(0x333333);
        } else {
            bg.fillStyle(0x27ae60);
        }
        bg.fillRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 10);

        this.add.text(x, y, text, {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '16px' : '24px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(x, y, btnW, btnH, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });

        hitArea.on('pointerover', () => {
            bg.clear();
            if (isSecondary) {
                bg.fillStyle(0x444444);
            } else {
                bg.fillStyle(0x2ecc71);
            }
            bg.fillRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 10);
        });

        hitArea.on('pointerout', () => {
            bg.clear();
            if (isSecondary) {
                bg.fillStyle(0x333333);
            } else {
                bg.fillStyle(0x27ae60);
            }
            bg.fillRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 10);
        });

        hitArea.on('pointerdown', callback);
    }

    createNameEntry(cx, cy, compact) {
        this.removeNameForm();

        const inputW = compact ? 150 : 172;
        const btnW = compact ? 82 : 94;
        const formH = 44;
        const gap = 8;
        const totalW = inputW + gap + btnW;

        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;display:block;box-sizing:border-box;z-index:60;';

        const label = document.createElement('div');
        label.textContent = 'ENTER YOUR NAME';
        label.style.cssText = 'display:none;margin:0 0 8px;color:#f39c12;'
            + "font-family:'Mona Sans',sans-serif;font-size:14px;font-weight:800;"
            + 'letter-spacing:0.08em;text-align:center;';

        const controls = document.createElement('div');
        controls.style.cssText = `display:flex;align-items:center;gap:${gap}px;width:100%;`;

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 24;
        input.placeholder = 'Your name';
        input.setAttribute('aria-label', 'Your leaderboard name');
        input.setAttribute('enterkeyhint', 'done');
        input.autocapitalize = 'none';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.value = this.pendingPlayerName;
        input.style.cssText = `width:${inputW}px;height:${formH}px;box-sizing:border-box;`
            + 'border:2px solid #274a36;border-radius:8px;background:rgba(9,25,36,0.92);'
            + "color:#ffffff;font-family:'Mona Sans',sans-serif;font-weight:700;"
            + 'font-size:16px;padding:0 12px;outline:none;';
        input.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                input.blur();
                this.handleSubmitName(input);
            }
            ev.stopPropagation();
        });
        input.addEventListener('input', () => {
            this.pendingPlayerName = input.value;
        });

        let isFocused = false;
        const updatePosition = () => {
            if (!wrap.parentNode) return;
            const vv = window.visualViewport;
            const rect = this.scale.canvas.getBoundingClientRect();
            const layout = getNameEntryLayout({
                focused: isFocused,
                visualViewport: vv ? {
                    width: vv.width,
                    height: vv.height,
                    offsetLeft: vv.offsetLeft,
                    offsetTop: vv.offsetTop,
                } : null,
                windowViewport: { width: window.innerWidth, height: window.innerHeight },
                canvasRect: rect,
                gameSize: { width: this.scale.width, height: this.scale.height },
                anchor: { x: cx, y: cy },
                inlineWidth: totalW,
                rowHeight: formH,
            });

            wrap.style.left = `${layout.left}px`;
            wrap.style.top = `${layout.top}px`;
            wrap.style.width = `${layout.width}px`;

            if (layout.mode === 'typing') {
                wrap.style.zIndex = '1000';
                wrap.style.padding = '12px';
                wrap.style.borderRadius = '14px';
                wrap.style.background = 'rgba(7, 21, 12, 0.98)';
                wrap.style.boxShadow = '0 8px 28px rgba(0,0,0,0.9), 0 0 0 2px #27ae60';
                label.style.display = 'block';
                input.style.width = 'auto';
                input.style.flex = '1 1 auto';
                input.style.height = '48px';
                input.style.fontSize = '18px';
                input.style.borderColor = '#27ae60';
                saveBtn.style.width = '92px';
                saveBtn.style.height = '48px';
                saveBtn.style.fontSize = '14px';
            } else {
                wrap.style.zIndex = '60';
                wrap.style.padding = '0';
                wrap.style.borderRadius = '0';
                wrap.style.background = 'transparent';
                wrap.style.boxShadow = 'none';
                label.style.display = 'none';
                input.style.width = `${inputW}px`;
                input.style.flex = '0 0 auto';
                input.style.height = `${formH}px`;
                input.style.fontSize = '16px';
                input.style.borderColor = '#274a36';
                saveBtn.style.width = `${btnW}px`;
                saveBtn.style.height = `${formH}px`;
                saveBtn.style.fontSize = compact ? '12px' : '13px';
            }
        };

        const onFocus = () => {
            isFocused = true;
            updatePosition();
        };

        const onBlur = () => {
            isFocused = false;
            updatePosition();
        };

        input.addEventListener('focus', onFocus);
        input.addEventListener('blur', onBlur);

        const onVvResize = () => updatePosition();
        const onVvScroll = () => updatePosition();
        const onWinResize = () => updatePosition();

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', onVvResize);
            window.visualViewport.addEventListener('scroll', onVvScroll);
        }
        window.addEventListener('resize', onWinResize);

        this._cleanNameFormListeners = () => {
            input.removeEventListener('focus', onFocus);
            input.removeEventListener('blur', onBlur);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', onVvResize);
                window.visualViewport.removeEventListener('scroll', onVvScroll);
            }
            window.removeEventListener('resize', onWinResize);
        };

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.textContent = 'SAVE';
        saveBtn.style.cssText = `width:${btnW}px;height:${formH}px;border:none;border-radius:8px;`
            + 'background:#27ae60;color:#ffffff;font-family:\'Mona Sans\',sans-serif;'
            + `font-weight:800;font-size:${compact ? 12 : 13}px;letter-spacing:0.06em;cursor:pointer;`;
        saveBtn.addEventListener('pointerdown', (event) => event.preventDefault());
        saveBtn.addEventListener('click', () => {
            this.handleSubmitName(input);
            input.blur();
        });

        controls.appendChild(input);
        controls.appendChild(saveBtn);
        wrap.appendChild(label);
        wrap.appendChild(controls);
        document.body.appendChild(wrap);
        this.nameForm = wrap;
        this.nameInput = input;
        updatePosition();
    }

    removeNameForm() {
        if (this._cleanNameFormListeners) {
            this._cleanNameFormListeners();
            this._cleanNameFormListeners = null;
        }
        if (this.nameForm) {
            this.nameForm.remove();
            this.nameForm = null;
        }
        this.nameInput = null;
    }
}
