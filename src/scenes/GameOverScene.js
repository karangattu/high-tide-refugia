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

    createPanel(width, height) {
        const compact = width < 600;
        const panelW = Math.min(500, width - 30);
        const panelH = Math.min(560, height - 40);
        const panelX = width / 2 - panelW / 2;
        const panelY = Math.max(20, (height - panelH) / 2);

        const panel = this.add.graphics();
        panel.fillStyle(0x1a2a1a, 0.95);
        panel.fillRoundedRect(panelX, panelY, panelW, panelH, 24);
        panel.lineStyle(3, 0x27ae60, 0.5);
        panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 24);

        const titleText = this.victory ? 'MARSH SAVED!' : (this.stats.railsSaved > 0 ? 'TIDE SURVIVED!' : 'SWEPT AWAY');
        const titleColor = this.victory ? '#2ecc71' : (this.stats.railsSaved > 0 ? '#27ae60' : '#e74c3c');

        this.add.text(width / 2, panelY + (compact ? 40 : 50), titleText, {
            fontFamily: 'Outfit',
            fontSize: compact ? '30px' : '42px',
            fontStyle: 'bold',
            color: titleColor,
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        this.add.text(width / 2, panelY + (compact ? 75 : 100), this.reason, {
            fontFamily: 'Outfit',
            fontSize: compact ? '16px' : '20px',
            color: '#888888',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        this.add.text(width / 2, panelY + (compact ? 110 : 170), 'FINAL SCORE', {
            fontFamily: 'Outfit',
            fontSize: compact ? '13px' : '16px',
            color: '#f39c12',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        const scoreText = this.add.text(width / 2, panelY + (compact ? 145 : 215), this.stats.score?.toString() || '0', {
            fontFamily: 'Outfit',
            fontSize: compact ? '42px' : '64px',
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

        const statsY = panelY + (compact ? 190 : 290);
        const statsSpacing = compact ? 30 : 40;
        const statsData = [
            { icon: 'icon_heart_green', label: 'Rails Saved', value: this.stats.railsSaved || 0, color: '#27ae60' },
            { icon: 'icon_heart_broken', label: 'Rails Lost', value: this.stats.railsLost || 0, color: '#e74c3c' },
            { icon: 'icon_leaf', label: 'Perfect Runs', value: this.stats.perfectRuns || 0, color: '#f1c40f' },
            { icon: 'icon_flame', label: 'Max Combo', value: this.stats.maxCombo || 0, color: '#e67e22' },
        ];

        statsData.forEach((stat, i) => {
            const y = statsY + i * statsSpacing;

            this.add.image(width / 2 - (compact ? 70 : 100), y, stat.icon).setScale(compact ? 0.7 : 0.9);

            this.add.text(width / 2 - (compact ? 50 : 70), y, stat.label, {
                fontFamily: 'Outfit',
                fontSize: compact ? '13px' : '16px',
                color: '#aaaaaa',
                resolution: TEXT_RES,
            }).setOrigin(0, 0.5);

            this.add.text(width / 2 + (compact ? 70 : 100), y, stat.value.toString(), {
                fontFamily: 'Outfit',
                fontSize: compact ? '16px' : '20px',
                fontStyle: 'bold',
                color: stat.color,
                resolution: TEXT_RES,
            }).setOrigin(0.5);
        });

        const survivalRate = this.stats.survivalRate ? Math.round(this.stats.survivalRate * 100) : 0;
        this.add.text(width / 2, panelY + panelH - (compact ? 90 : 100), `${survivalRate}% Survival Rate`, {
            fontFamily: 'Outfit',
            fontSize: compact ? '14px' : '18px',
            color: survivalRate >= 50 ? '#27ae60' : '#e74c3c',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        const buttonY = panelY + panelH - (compact ? 45 : 50);
        const btnSpread = compact ? 75 : 110;

        this.createButton(width / 2 - btnSpread, buttonY, 'PLAY AGAIN', () => {
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

    createButton(x, y, text, callback, isSecondary = false) {
        const compact = this.scale.width < 600;
        const btnW = compact ? 120 : 160;
        const btnH = compact ? 36 : 44;

        const bg = this.add.graphics();
        if (isSecondary) {
            bg.fillStyle(0x333333);
        } else {
            bg.fillStyle(0x27ae60);
        }
        bg.fillRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 10);

        const buttonText = this.add.text(x, y, text, {
            fontFamily: 'Outfit',
            fontSize: compact ? '14px' : '18px',
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
