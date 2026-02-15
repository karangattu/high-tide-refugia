import Phaser from 'phaser';

const TEXT_RES = window.devicePixelRatio || 2;

export class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.stats = data.stats || {};
        this.reason = data.reason || 'Game Over';
        this.level = data.level || 1;
    }

    create() {
        const { width, height } = this.scale;

        // Background
        this.createBackground(width, height);

        // Game Over panel
        this.createPanel(width, height);

        // Fade in
        this.cameras.main.fadeIn(500);
    }

    createBackground(width, height) {
        // Dark overlay
        this.add.rectangle(width / 2, height / 2, width, height, 0x0d1f2d, 1);

        // Subtle water pattern at bottom
        for (let x = 0; x < width; x += 64) {
            this.add.image(x + 32, height - 32, 'water').setAlpha(0.3);
        }
    }

    createPanel(width, height) {
        // Panel background
        const panel = this.add.graphics();
        panel.fillStyle(0x1a2a1a, 0.95);
        panel.fillRoundedRect(width / 2 - 250, 80, 500, 560, 24);
        panel.lineStyle(3, 0x27ae60, 0.5);
        panel.strokeRoundedRect(width / 2 - 250, 80, 500, 560, 24);

        // Title
        const titleText = this.stats.railsSaved > 0 ? 'TIDE SURVIVED!' : 'SWEPT AWAY';
        const titleColor = this.stats.railsSaved > 0 ? '#27ae60' : '#e74c3c';

        this.add.text(width / 2, 130, titleText, {
            fontFamily: 'Outfit',
            fontSize: '42px',
            fontStyle: 'bold',
            color: titleColor,
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        // Level reached
        this.add.text(width / 2, 180, `Level ${this.level} Reached`, {
            fontFamily: 'Outfit',
            fontSize: '20px',
            color: '#888888',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        // Score
        this.add.text(width / 2, 250, 'FINAL SCORE', {
            fontFamily: 'Outfit',
            fontSize: '16px',
            color: '#f39c12',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        const scoreText = this.add.text(width / 2, 295, this.stats.score?.toString() || '0', {
            fontFamily: 'Outfit',
            fontSize: '64px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        // Animate score counting up
        this.tweens.addCounter({
            from: 0,
            to: this.stats.score || 0,
            duration: 1500,
            ease: 'Power2',
            onUpdate: (tween) => {
                scoreText.setText(Math.floor(tween.getValue()).toString());
            }
        });

        // Stats
        const statsY = 370;
        const statsData = [
            { icon: 'icon_heart_green', label: 'Rails Saved', value: this.stats.railsSaved || 0, color: '#27ae60' },
            { icon: 'icon_heart_broken', label: 'Rails Lost', value: this.stats.railsLost || 0, color: '#e74c3c' },
            { icon: 'icon_leaf', label: 'Perfect Runs', value: this.stats.perfectRuns || 0, color: '#f1c40f' },
            { icon: 'icon_flame', label: 'Max Combo', value: this.stats.maxCombo || 0, color: '#e67e22' },
        ];

        statsData.forEach((stat, i) => {
            const y = statsY + i * 40;

            this.add.image(width / 2 - 100, y, stat.icon).setScale(0.9);

            this.add.text(width / 2 - 70, y, stat.label, {
                fontFamily: 'Outfit',
                fontSize: '16px',
                color: '#aaaaaa',
                resolution: TEXT_RES,
            }).setOrigin(0, 0.5);

            this.add.text(width / 2 + 100, y, stat.value.toString(), {
                fontFamily: 'Outfit',
                fontSize: '20px',
                fontStyle: 'bold',
                color: stat.color,
                resolution: TEXT_RES,
            }).setOrigin(0.5);
        });

        // Survival rate
        const survivalRate = this.stats.survivalRate ? Math.round(this.stats.survivalRate * 100) : 0;
        this.add.text(width / 2, 540, `${survivalRate}% Survival Rate`, {
            fontFamily: 'Outfit',
            fontSize: '18px',
            color: survivalRate >= 50 ? '#27ae60' : '#e74c3c',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        // Buttons
        const buttonY = 600;

        // Play Again button
        this.createButton(width / 2 - 110, buttonY, 'PLAY AGAIN', () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => {
                this.scene.start('GameScene');
                this.scene.launch('UIScene');
            });
        });

        // Menu button
        this.createButton(width / 2 + 110, buttonY, 'MENU', () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => {
                this.scene.start('MenuScene');
            });
        }, true);
    }

    createButton(x, y, text, callback, isSecondary = false) {
        const bg = this.add.graphics();
        if (isSecondary) {
            bg.fillStyle(0x333333);
        } else {
            bg.fillStyle(0x27ae60);
        }
        bg.fillRoundedRect(x - 80, y - 22, 160, 44, 10);

        const buttonText = this.add.text(x, y, text, {
            fontFamily: 'Outfit',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        }).setOrigin(0.5);

        // Interactive zone
        const hitArea = this.add.rectangle(x, y, 160, 44, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });

        hitArea.on('pointerover', () => {
            bg.clear();
            if (isSecondary) {
                bg.fillStyle(0x444444);
            } else {
                bg.fillStyle(0x2ecc71);
            }
            bg.fillRoundedRect(x - 80, y - 22, 160, 44, 10);
        });

        hitArea.on('pointerout', () => {
            bg.clear();
            if (isSecondary) {
                bg.fillStyle(0x333333);
            } else {
                bg.fillStyle(0x27ae60);
            }
            bg.fillRoundedRect(x - 80, y - 22, 160, 44, 10);
        });

        hitArea.on('pointerdown', callback);
    }
}
