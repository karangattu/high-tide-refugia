import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        const { width, height } = this.scale;
        const gameScene = this.scene.get('GameScene');

        // Seed Bank UI (top left)
        this.createSeedBankUI(20, 20);

        // Score UI (top right)
        this.createScoreUI(width - 20, 20);

        // Stats UI (bottom)
        this.createStatsUI(width / 2, height - 20);

        // Level/Wave indicator
        this.createLevelUI(width / 2, 20);

        // Listen for updates from GameScene
        gameScene.events.on('seedsUpdate', this.updateSeedBank, this);
        gameScene.events.on('scoreUpdate', this.updateScore, this);
        gameScene.events.on('statsUpdate', this.updateStats, this);
        gameScene.events.on('pauseToggle', this.togglePauseOverlay, this);

        // Cleanup on scene shutdown
        this.events.on('shutdown', () => {
            gameScene.events.off('seedsUpdate', this.updateSeedBank, this);
            gameScene.events.off('scoreUpdate', this.updateScore, this);
            gameScene.events.off('statsUpdate', this.updateStats, this);
            gameScene.events.off('pauseToggle', this.togglePauseOverlay, this);
        });
    }

    createSeedBankUI(x, y) {
        // Background panel
        this.seedBankBg = this.add.image(x + 140, y + 40, 'seedbank_bg')
            .setOrigin(0.5);

        // Icon
        this.add.image(x + 30, y + 40, 'seed')
            .setScale(2);

        // Title
        this.add.text(x + 60, y + 15, 'SEED BANK', {
            fontFamily: 'Outfit',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#f39c12',
        });

        // Seeds text
        this.seedsText = this.add.text(x + 60, y + 40, '8 / 10', {
            fontFamily: 'Outfit',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#ffffff',
        });

        // Progress bar background
        this.seedBarBg = this.add.rectangle(x + 155, y + 62, 160, 12, 0x333333)
            .setOrigin(0.5);

        // Progress bar fill
        this.seedBarFill = this.add.rectangle(x + 75, y + 62, 160, 12, 0xf39c12)
            .setOrigin(0, 0.5);
    }

    createScoreUI(x, y) {
        // Background panel
        this.scoreBg = this.add.image(x - 100, y + 60, 'score_panel')
            .setOrigin(0.5);

        // Score label
        this.add.text(x - 180, y + 15, 'SCORE', {
            fontFamily: 'Outfit',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#27ae60',
        });

        // Score value
        this.scoreText = this.add.text(x - 180, y + 40, '0', {
            fontFamily: 'Outfit',
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#ffffff',
        });

        // Combo multiplier
        this.comboText = this.add.text(x - 180, y + 85, 'x1.0', {
            fontFamily: 'Outfit',
            fontSize: '18px',
            color: '#f1c40f',
        }).setAlpha(0.5);
    }

    createStatsUI(x, y) {
        // Rails saved
        this.savedIcon = this.add.text(x - 100, y - 10, '💚', {
            fontSize: '24px',
        }).setOrigin(0.5);

        this.savedText = this.add.text(x - 70, y - 10, '0 saved', {
            fontFamily: 'Outfit',
            fontSize: '16px',
            color: '#27ae60',
        }).setOrigin(0, 0.5);

        // Rails lost
        this.lostIcon = this.add.text(x + 50, y - 10, '💔', {
            fontSize: '24px',
        }).setOrigin(0.5);

        this.lostText = this.add.text(x + 80, y - 10, '0 lost', {
            fontFamily: 'Outfit',
            fontSize: '16px',
            color: '#e74c3c',
        }).setOrigin(0, 0.5);
    }

    createLevelUI(x, y) {
        this.levelText = this.add.text(x, y + 10, 'LEVEL 1', {
            fontFamily: 'Outfit',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffffff',
        }).setOrigin(0.5);
    }

    updateSeedBank(current, max) {
        this.seedsText.setText(`${current} / ${max}`);

        // Update bar
        const percentage = current / max;
        this.seedBarFill.width = 160 * percentage;

        // Color based on amount
        if (percentage > 0.5) {
            this.seedBarFill.setFillStyle(0xf39c12);
        } else if (percentage > 0.25) {
            this.seedBarFill.setFillStyle(0xe67e22);
        } else {
            this.seedBarFill.setFillStyle(0xe74c3c);
        }

        // Pulse effect when low
        if (percentage < 0.25) {
            this.tweens.add({
                targets: this.seedsText,
                alpha: { from: 1, to: 0.5 },
                duration: 200,
                yoyo: true,
            });
        }
    }

    updateScore(score, comboMultiplier) {
        const oldScore = parseInt(this.scoreText.text);
        const newScore = score;

        // Animate score change
        if (newScore > oldScore) {
            this.tweens.add({
                targets: this.scoreText,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 100,
                yoyo: true,
            });
        }

        this.scoreText.setText(score.toString());

        // Update combo
        if (comboMultiplier > 1) {
            this.comboText.setText(`x${comboMultiplier.toFixed(1)}`);
            this.comboText.setAlpha(1);
            this.comboText.setColor('#f1c40f');
        } else {
            this.comboText.setText('x1.0');
            this.comboText.setAlpha(0.5);
        }
    }

    updateStats(stats) {
        this.savedText.setText(`${stats.railsSaved} saved`);
        this.lostText.setText(`${stats.railsLost} lost`);

        // Update level display
        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.levelManager) {
            const progress = gameScene.levelManager.getLevelProgress();
            this.levelText.setText(`LEVEL ${progress.level} - ${progress.levelName}`);
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
                    fontSize: '48px',
                    fontStyle: 'bold',
                    color: '#ffffff',
                    align: 'center',
                }
            ).setOrigin(0.5).setDepth(201);
        } else {
            if (this.pauseOverlay) {
                this.pauseOverlay.destroy();
                this.pauseOverlay = null;
            }
            if (this.pauseText) {
                this.pauseText.destroy();
                this.pauseText = null;
            }
        }
    }
}
