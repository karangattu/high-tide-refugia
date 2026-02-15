import Phaser from 'phaser';

// All available marsh-plant species
export const PLANT_TYPES = [
    { key: 'gumplant',   label: 'Gumplant',   desc: 'Grindelia stricta – bushy with yellow flowers' },
    { key: 'saltgrass',  label: 'Saltgrass',  desc: 'Distichlis spicata – low blue-green tufts' },
    { key: 'pickleweed', label: 'Pickleweed', desc: 'Salicornia pacifica – succulent red-green stems' },
    { key: 'cordgrass',  label: 'Cordgrass',  desc: 'Spartina foliosa – tall arching blades' },
    { key: 'jaumea',     label: 'Jaumea',     desc: 'Jaumea carnosa – fleshy mat with tiny flowers' },
];

export class Plant extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type = 'gumplant') {
        // Use the matching texture key; fall back to legacy 'plant'
        const textureKey = PLANT_TYPES.find(p => p.key === type) ? type : 'plant';
        super(scene, x, y, textureKey);

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

// Placement preview ghost – shows the texture of the next plant type
export class PlantPreview extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'plant');

        scene.add.existing(this);

        this.setAlpha(0.5);
        this.setTint(0x00ff00);
        this.setScale(0.8);
        this.setVisible(false);
    }

    /** Update which plant species the preview shows */
    setPlantType(typeKey) {
        const tex = PLANT_TYPES.find(p => p.key === typeKey) ? typeKey : 'plant';
        this.setTexture(tex);
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
