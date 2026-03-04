import * as Phaser from 'phaser';

const TEXT_RES = window.devicePixelRatio || 2;

export class IntroScene extends Phaser.Scene {
    constructor() {
        super({ key: 'IntroScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Keep background dark
        this.cameras.main.setBackgroundColor('#000000');

        // Add the video
        const video = this.add.video(width / 2, height / 2, 'intro_video');

        // Play the video at its native size (as is)

        video.setAlpha(0);

        // Wait a small moment before playing to ensure smooth transition
        this.time.delayedCall(500, () => {
            video.play();

            // Fade in the video
            this.tweens.add({
                targets: video,
                alpha: 1,
                duration: 1000,
                ease: 'Linear'
            });
        });

        // Instructions
        const skipText = this.add.text(width - 20, height - 20, 'Click or Press Space to Skip', {
            fontFamily: 'Outfit',
            fontSize: '18px',
            color: '#ffffff',
            alpha: 0.5,
            resolution: TEXT_RES
        }).setOrigin(1, 1);

        // Set up skip functionality
        let skipped = false;
        const skipIntro = () => {
            if (skipped) return;
            skipped = true;

            // Fade out then transition
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                video.pause(); // Stop the video
                video.destroy();
                this.scene.start('GameScene');
                this.scene.launch('UIScene');
            });

            this.tweens.add({
                targets: [video, skipText],
                alpha: 0,
                duration: 500
            });
        };

        // Skip on video complete
        video.on('complete', () => {
            skipIntro();
        });

        // Skip on interaction
        this.input.on('pointerdown', () => {
            skipIntro();
        });

        this.input.keyboard.on('keydown-SPACE', () => {
            skipIntro();
        });

        this.input.keyboard.on('keydown-ENTER', () => {
            skipIntro();
        });

        this.input.keyboard.on('keydown-ESC', () => {
            skipIntro();
        });
    }
}
