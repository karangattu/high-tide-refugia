import * as Phaser from 'phaser';

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
    }

    create() {
        const { width, height } = this.scale;

        this.createBackground(width, height);
        this.createPanel(width, height);
        this.cameras.main.fadeIn(500);
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
            subText: 'Plant continuous plant cover so rails can shelter from predators.',
            buttonText: 'TRY AGAIN',
        };
    }

    createPanel(width, height) {
        const isLandscape = height <= 520 || (width >= 680 && width > height);
        const compact = height <= 520 || width < 680;

        if (isLandscape) {
            const panelW = Math.min(compact ? 680 : 760, width - 30);
            const panelH = Math.min(compact ? 320 : 380, height - 20);
            const panelX = width / 2 - panelW / 2;
            const panelY = Math.max(10, (height - panelH) / 2);

            const header = this.getHeaderInfo();

            const panel = this.add.graphics();
            panel.fillStyle(0x1a2a1a, 0.95);
            panel.fillRoundedRect(panelX, panelY, panelW, panelH, 20);
            panel.lineStyle(2, header.borderColor, 0.6);
            panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 20);

            const col1X = panelX + panelW * 0.28;
            const col2X = panelX + panelW * 0.72;

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
                wordWrap: { width: panelW * 0.44 },
                align: 'center',
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
                { icon: 'icon_leaf', label: 'Perfect Runs', value: this.stats.perfectRuns || 0, color: '#f1c40f' },
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

            const buttonY = panelY + panelH - (compact ? 42 : 50);
            const btnSpread = compact ? 90 : 110;
            this.createButton(col2X - btnSpread, buttonY, header.buttonText, () => {
                this.cameras.main.fadeOut(300);
                this.time.delayedCall(300, () => {
                    this.scene.start('GameScene');
                    this.scene.launch('UIScene');
                });
            }, false, compact ? 140 : 160, compact ? 42 : 48);

            this.createButton(col2X + btnSpread, buttonY, 'MENU', () => {
                this.cameras.main.fadeOut(300);
                this.time.delayedCall(300, () => {
                    this.scene.start('MenuScene');
                });
            }, true, compact ? 120 : 140, compact ? 42 : 48);

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
            { icon: 'icon_leaf', label: 'Perfect Runs', value: this.stats.perfectRuns || 0, color: '#f1c40f' },
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
}
