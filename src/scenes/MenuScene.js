import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Background layers
        this.createBackground(width, height);

        // Animated title
        this.createTitle(width);

        // Floating particles
        this.createParticles(width, height);

        // Menu buttons
        this.createButtons(width, height);

        // Fade in
        this.cameras.main.fadeIn(500);
    }

    createBackground(width, height) {
        // Water layer (left)
        for (let y = 0; y < height; y += 64) {
            for (let x = 0; x < width * 0.35; x += 64) {
                this.add.image(x + 32, y + 32, 'water');
            }
        }

        // Transition zone (middle) 
        for (let y = 0; y < height; y += 64) {
            for (let x = width * 0.35; x < width * 0.7; x += 64) {
                this.add.image(x + 32, y + 32, 'mud');
            }
        }

        // Upland (right)
        for (let y = 0; y < height; y += 64) {
            for (let x = width * 0.7; x < width; x += 64) {
                this.add.image(x + 32, y + 32, 'grass');
            }
        }

        // Dark overlay for contrast
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);

        // Vignette effect
        const vignette = this.add.graphics();
        vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.8, 0.8, 0, 0);
        vignette.fillRect(0, 0, width, height * 0.15);
        vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.8, 0.8);
        vignette.fillRect(0, height * 0.85, width, height * 0.15);
    }

    createTitle(width) {
        // Main title with glow effect
        const titleGlow = this.add.text(width / 2, 120, 'RAIL REFUGE', {
            fontFamily: 'Outfit',
            fontSize: '72px',
            fontStyle: 'bold',
            color: '#f39c12',
        }).setOrigin(0.5).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD);

        const title = this.add.text(width / 2, 120, 'RAIL REFUGE', {
            fontFamily: 'Outfit',
            fontSize: '72px',
            fontStyle: 'bold',
            color: '#f39c12',
        }).setOrigin(0.5);

        // Subtitle
        const subtitle = this.add.text(width / 2, 180, 'High Tide Rising', {
            fontFamily: 'Outfit',
            fontSize: '28px',
            color: '#3498db',
        }).setOrigin(0.5);

        // Animate title glow
        this.tweens.add({
            targets: titleGlow,
            scaleX: 1.05,
            scaleY: 1.05,
            alpha: 0.5,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Subtitle fade in
        subtitle.setAlpha(0);
        this.tweens.add({
            targets: subtitle,
            alpha: 1,
            y: 185,
            duration: 1000,
            delay: 300,
            ease: 'Power2',
        });
    }

    createParticles(width, height) {
        // Floating seeds
        const seedParticles = this.add.particles(0, 0, 'seed', {
            x: { min: 0, max: width },
            y: { min: -20, max: -10 },
            lifespan: 8000,
            speedY: { min: 20, max: 40 },
            speedX: { min: -20, max: 20 },
            scale: { start: 0.5, end: 0.3 },
            alpha: { start: 0.8, end: 0 },
            rotate: { min: 0, max: 360 },
            frequency: 500,
            blendMode: Phaser.BlendModes.ADD,
        });

        // Water shimmer (left side)
        const waterParticles = this.add.particles(0, 0, 'seed', {
            x: { min: 0, max: width * 0.35 },
            y: { min: 0, max: height },
            lifespan: 3000,
            speedY: { min: -10, max: 10 },
            speedX: { min: 5, max: 15 },
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.3, end: 0 },
            tint: 0x3498db,
            frequency: 200,
        });
    }

    createButtons(width, height) {
        const buttonY = height / 2 + 80;
        const buttonSpacing = 80;

        // Play button
        this.createButton(width / 2, buttonY, 'PLAY', () => {
            this.cameras.main.fadeOut(500);
            this.time.delayedCall(500, () => {
                this.scene.start('GameScene');
                this.scene.launch('UIScene');
            });
        });

        // Tutorial button
        this.createButton(width / 2, buttonY + buttonSpacing, 'HOW TO PLAY', () => {
            this.showTutorial();
        });

        // Credits placeholder
        this.createButton(width / 2, buttonY + buttonSpacing * 2, 'CREDITS', () => {
            this.showCredits();
        });

        // Educational tagline
        const tagline = this.add.text(width / 2, height - 60,
            '🌿 Learn about endangered Ridgway\'s Rails and marsh conservation 🌿', {
            fontFamily: 'Outfit',
            fontSize: '16px',
            color: '#ffffff',
            alpha: 0.6,
        }).setOrigin(0.5);
    }

    createButton(x, y, text, callback) {
        const button = this.add.image(x, y, 'button')
            .setInteractive({ useHandCursor: true });

        const buttonText = this.add.text(x, y, text, {
            fontFamily: 'Outfit',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Hover effects
        button.on('pointerover', () => {
            button.setTexture('button_hover');
            this.tweens.add({
                targets: [button, buttonText],
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 100,
            });
        });

        button.on('pointerout', () => {
            button.setTexture('button');
            this.tweens.add({
                targets: [button, buttonText],
                scaleX: 1,
                scaleY: 1,
                duration: 100,
            });
        });

        button.on('pointerdown', () => {
            this.tweens.add({
                targets: [button, buttonText],
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 50,
                yoyo: true,
                onComplete: callback,
            });
        });

        return { button, buttonText };
    }

    showTutorial() {
        const { width, height } = this.scale;

        // Overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setInteractive();

        // Tutorial panel
        const panel = this.add.graphics();
        panel.fillStyle(0x1a2a1a, 0.95);
        panel.fillRoundedRect(width / 2 - 350, height / 2 - 250, 700, 500, 20);
        panel.lineStyle(2, 0x27ae60);
        panel.strokeRoundedRect(width / 2 - 350, height / 2 - 250, 700, 500, 20);

        // Title
        this.add.text(width / 2, height / 2 - 200, 'HOW TO PLAY', {
            fontFamily: 'Outfit',
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#f39c12',
        }).setOrigin(0.5);

        // Instructions
        const instructions = [
            '🌊 The tide is rising! Rails flee from left to right.',
            '🌿 CLICK to plant vegetation and create hiding spots.',
            '🦊 Predators hunt exposed Rails - keep them hidden!',
            '⚡ Rails in plants become invisible to predators.',
            '🏆 Bonus points for "Continuous Cover" paths!',
            '💚 Save as many Rails as you can before the tide rises!',
        ];

        instructions.forEach((text, i) => {
            this.add.text(width / 2, height / 2 - 120 + i * 45, text, {
                fontFamily: 'Outfit',
                fontSize: '20px',
                color: '#ffffff',
            }).setOrigin(0.5);
        });

        // Close button
        const closeBtn = this.add.text(width / 2, height / 2 + 200, 'GOT IT!', {
            fontFamily: 'Outfit',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#27ae60',
            backgroundColor: '#000000',
            padding: { x: 30, y: 15 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerover', () => closeBtn.setColor('#2ecc71'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#27ae60'));
        closeBtn.on('pointerdown', () => {
            overlay.destroy();
            panel.destroy();
            closeBtn.destroy();
            this.scene.scene.children.list
                .filter(c => c.type === 'Text' && instructions.some(i => c.text === i))
                .forEach(c => c.destroy());
        });
    }

    showCredits() {
        const { width, height } = this.scale;

        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setInteractive();

        const credits = this.add.text(width / 2, height / 2,
            'RAIL REFUGE: High Tide Rising\n\n' +
            'A game about conservation and\n' +
            'protecting endangered species.\n\n' +
            'Learn more about Ridgway\'s Rails at:\n' +
            'sfbayrestore.org\n\n' +
            'Click anywhere to close', {
            fontFamily: 'Outfit',
            fontSize: '24px',
            color: '#ffffff',
            align: 'center',
        }).setOrigin(0.5);

        overlay.on('pointerdown', () => {
            overlay.destroy();
            credits.destroy();
        });
    }
}
