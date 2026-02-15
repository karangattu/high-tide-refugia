import Phaser from 'phaser';

export class Plant extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type = 'gumplant') {
        super(scene, x, y, 'plant');

        scene.add.existing(this);
        scene.physics.add.existing(this, true); // Static body

        this.plantType = type;

        // Physics body for collision
        this.body.setSize(40, 40);
        this.body.setOffset(4, 4);

        // Start small and grow (juice!)
        this.setScale(0);
        this.spawnAnimation();

        // Emit dirt particles
        if (scene.particleManager) {
            scene.particleManager.emitDirt(x, y);
        }
    }

    spawnAnimation() {
        // Pop-up growth animation
        this.scene.tweens.add({
            targets: this,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut',
        });

        // Slight wobble after landing
        this.scene.tweens.add({
            targets: this,
            angle: { from: -5, to: 5 },
            duration: 200,
            delay: 300,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut',
        });
    }

    // Called when a rail enters this plant
    onRailEnter(rail) {
        rail.enterPlant();

        // Subtle plant reaction
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.1,
            scaleY: 0.9,
            duration: 100,
            yoyo: true,
        });
    }

    // Called when a rail exits this plant
    onRailExit(rail) {
        rail.exitPlant();
    }

    // Visual highlight when hovering for placement preview
    highlight() {
        this.setTint(0x00ff00);
    }

    unhighlight() {
        this.clearTint();
    }
}

// Placement preview ghost
export class PlantPreview extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'plant');

        scene.add.existing(this);

        this.setAlpha(0.5);
        this.setTint(0x00ff00);
        this.setScale(0.8);
        this.setVisible(false);
    }

    show(x, y, canPlace = true) {
        this.setPosition(x, y);
        this.setVisible(true);
        this.setTint(canPlace ? 0x00ff00 : 0xff0000);
    }

    hide() {
        this.setVisible(false);
    }
}
