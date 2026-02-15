import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Get loading bar element
        const loadingBar = document.getElementById('loading-bar');

        // Update loading bar as assets load
        this.load.on('progress', (value) => {
            if (loadingBar) {
                loadingBar.style.width = `${value * 100}%`;
            }
        });

        this.load.on('complete', () => {
            // Hide loading screen with fade
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }
        });

        // Load real Rail sprite images
        this.load.image('rail_running_1', 'assets/sprites/rail_running_1.png');
        this.load.image('rail_running_2', 'assets/sprites/rail_running_2.png');
        this.load.image('rail_running_3', 'assets/sprites/rail_running_3.png');
        this.load.image('rail_running_4', 'assets/sprites/rail_running_4.png');
        this.load.image('rail_hiding', 'assets/sprites/rail_hiding.png');
        this.load.image('rail_standing', 'assets/sprites/rail_standing.png');
        this.load.image('rail_surprised', 'assets/sprites/rail_surprised.png');
        this.load.image('rail_calling', 'assets/sprites/rail_making_a_call.png');

        // Load real Fox sprite images
        this.load.image('fox_walking_1', 'assets/sprites/fox_walking_1.png');
        this.load.image('fox_walking_2', 'assets/sprites/fox_walking_2.png');
        this.load.image('fox_walking_3', 'assets/sprites/fox_walking_3.png');
        this.load.image('fox_walking_4', 'assets/sprites/fox_walking_4.png');
        this.load.image('fox_pouncing', 'assets/sprites/fox_pouncing_1.png');
        this.load.image('fox_with_kill', 'assets/sprites/fox_standing_with_kill.png');

        // Create placeholder graphics for other assets
        this.createPlaceholderAssets();
    }

    createPlaceholderAssets() {

        // Plant/Gumplant sprite (48x48)
        const plantGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        // Bush base
        plantGraphics.fillStyle(0x228b22);
        plantGraphics.fillCircle(24, 32, 20);
        plantGraphics.fillStyle(0x32cd32);
        plantGraphics.fillCircle(16, 28, 14);
        plantGraphics.fillCircle(32, 28, 14);
        plantGraphics.fillCircle(24, 20, 16);
        // Yellow flowers (gumplant)
        plantGraphics.fillStyle(0xffd700);
        plantGraphics.fillCircle(18, 16, 5);
        plantGraphics.fillCircle(30, 18, 4);
        plantGraphics.fillCircle(24, 24, 4);
        plantGraphics.generateTexture('plant', 48, 48);
        plantGraphics.destroy();

        // Fox sprite (48x32)
        const foxGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        foxGraphics.fillStyle(0xd2691e);
        foxGraphics.fillEllipse(24, 20, 40, 20); // Body
        foxGraphics.fillStyle(0xff8c00);
        foxGraphics.fillCircle(40, 14, 10); // Head
        foxGraphics.fillTriangle(40, 4, 48, 12, 44, 4); // Ear 1
        foxGraphics.fillTriangle(36, 4, 44, 12, 40, 4); // Ear 2
        foxGraphics.fillStyle(0x000000);
        foxGraphics.fillCircle(44, 12, 2); // Eye
        foxGraphics.fillStyle(0xffffff);
        foxGraphics.fillEllipse(8, 20, 12, 6); // Tail tip
        foxGraphics.generateTexture('fox', 56, 32);
        foxGraphics.destroy();

        // Cat sprite (40x28)
        const catGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        catGraphics.fillStyle(0x404040);
        catGraphics.fillEllipse(20, 18, 32, 16); // Body
        catGraphics.fillCircle(34, 12, 8); // Head
        catGraphics.fillTriangle(30, 4, 36, 10, 32, 4); // Ear 1
        catGraphics.fillTriangle(36, 4, 42, 10, 38, 4); // Ear 2
        catGraphics.fillStyle(0x00ff00);
        catGraphics.fillCircle(36, 11, 2); // Eye
        catGraphics.generateTexture('cat', 48, 28);
        catGraphics.destroy();

        // Harrier shadow (64x32)
        const harrierGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        harrierGraphics.fillStyle(0x000000, 0.4);
        harrierGraphics.fillEllipse(32, 16, 56, 12); // Body shadow
        harrierGraphics.fillTriangle(0, 16, 20, 10, 20, 22); // Wing 1
        harrierGraphics.fillTriangle(44, 10, 44, 22, 64, 16); // Wing 2
        harrierGraphics.generateTexture('harrier', 64, 32);
        harrierGraphics.destroy();

        // Water tile (64x64)
        const waterGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        waterGraphics.fillGradientStyle(0x0a3d62, 0x0a3d62, 0x1e6f9f, 0x1e6f9f);
        waterGraphics.fillRect(0, 0, 64, 64);
        // Wave lines
        waterGraphics.lineStyle(2, 0x3498db, 0.3);
        waterGraphics.beginPath();
        waterGraphics.moveTo(0, 20);
        waterGraphics.lineTo(16, 16);
        waterGraphics.lineTo(32, 20);
        waterGraphics.lineTo(48, 16);
        waterGraphics.lineTo(64, 20);
        waterGraphics.stroke();
        waterGraphics.beginPath();
        waterGraphics.moveTo(0, 44);
        waterGraphics.lineTo(16, 40);
        waterGraphics.lineTo(32, 44);
        waterGraphics.lineTo(48, 40);
        waterGraphics.lineTo(64, 44);
        waterGraphics.stroke();
        waterGraphics.generateTexture('water', 64, 64);
        waterGraphics.destroy();

        // Mud/transition zone tile (64x64)
        const mudGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        mudGraphics.fillStyle(0x5d4e37);
        mudGraphics.fillRect(0, 0, 64, 64);
        // Texture details
        mudGraphics.fillStyle(0x4a3f2d, 0.5);
        mudGraphics.fillCircle(10, 15, 5);
        mudGraphics.fillCircle(45, 30, 7);
        mudGraphics.fillCircle(25, 50, 4);
        mudGraphics.fillCircle(55, 10, 3);
        mudGraphics.generateTexture('mud', 64, 64);
        mudGraphics.destroy();

        // Upland/grass tile (64x64)
        const grassGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        grassGraphics.fillStyle(0x4a7c23);
        grassGraphics.fillRect(0, 0, 64, 64);
        // Grass blades
        grassGraphics.fillStyle(0x5a8c33);
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * 64;
            const y = Math.random() * 64;
            grassGraphics.fillTriangle(x, y + 8, x + 3, y, x + 6, y + 8);
        }
        grassGraphics.generateTexture('grass', 64, 64);
        grassGraphics.destroy();

        // Seed particle (16x16)
        const seedGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        seedGraphics.fillStyle(0xf39c12);
        seedGraphics.fillCircle(8, 8, 4);
        seedGraphics.fillStyle(0xffffff, 0.5);
        seedGraphics.lineStyle(1, 0xffffff, 0.7);
        seedGraphics.beginPath();
        seedGraphics.moveTo(8, 4);
        seedGraphics.lineTo(8, 0);
        seedGraphics.lineTo(12, 2);
        seedGraphics.stroke();
        seedGraphics.generateTexture('seed', 16, 16);
        seedGraphics.destroy();

        // Heart particle (16x16)
        const heartGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        heartGraphics.fillStyle(0xff6b9d);
        heartGraphics.fillCircle(5, 6, 4);
        heartGraphics.fillCircle(11, 6, 4);
        heartGraphics.fillTriangle(1, 8, 8, 15, 15, 8);
        heartGraphics.generateTexture('heart', 16, 16);
        heartGraphics.destroy();

        // Dirt particle (8x8)
        const dirtGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        dirtGraphics.fillStyle(0x8b7355);
        dirtGraphics.fillCircle(4, 4, 3);
        dirtGraphics.generateTexture('dirt', 8, 8);
        dirtGraphics.destroy();

        // Button texture (200x60)
        const buttonGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        buttonGraphics.fillStyle(0x27ae60);
        buttonGraphics.fillRoundedRect(0, 0, 200, 60, 12);
        buttonGraphics.lineStyle(3, 0x2ecc71);
        buttonGraphics.strokeRoundedRect(0, 0, 200, 60, 12);
        buttonGraphics.generateTexture('button', 200, 60);
        buttonGraphics.destroy();

        // Button hover texture
        const buttonHoverGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        buttonHoverGraphics.fillStyle(0x2ecc71);
        buttonHoverGraphics.fillRoundedRect(0, 0, 200, 60, 12);
        buttonHoverGraphics.lineStyle(3, 0x58d68d);
        buttonHoverGraphics.strokeRoundedRect(0, 0, 200, 60, 12);
        buttonHoverGraphics.generateTexture('button_hover', 200, 60);
        buttonHoverGraphics.destroy();

        // Seed bank UI background (280x80)
        const seedBankGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        seedBankGraphics.fillStyle(0x000000, 0.4);
        seedBankGraphics.fillRoundedRect(0, 0, 280, 80, 16);
        seedBankGraphics.lineStyle(2, 0xffffff, 0.2);
        seedBankGraphics.strokeRoundedRect(0, 0, 280, 80, 16);
        seedBankGraphics.generateTexture('seedbank_bg', 280, 80);
        seedBankGraphics.destroy();

        // Score panel background
        const scorePanelGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        scorePanelGraphics.fillStyle(0x000000, 0.4);
        scorePanelGraphics.fillRoundedRect(0, 0, 200, 120, 16);
        scorePanelGraphics.lineStyle(2, 0xffffff, 0.2);
        scorePanelGraphics.strokeRoundedRect(0, 0, 200, 120, 16);
        scorePanelGraphics.generateTexture('score_panel', 200, 120);
        scorePanelGraphics.destroy();
    }

    create() {
        // Transition to menu scene
        this.scene.start('MenuScene');
    }
}
