import * as Phaser from 'phaser';

// All available marsh-plant species. Growth art comes from
// `{key}_sprite_sheet.png` (8 stages, sprout → mature), sliced in
// BootScene into `{key}_1..{key}_8`. targetW is the mature on-screen
// width in pixels; smaller species read as low ground cover.
export const PLANT_TYPES = [
    { key: 'gumplant',   label: 'Gumplant',   desc: 'Grindelia stricta – bushy with yellow flowers', targetW: 110 },
    { key: 'saltgrass',  label: 'Saltgrass',  desc: 'Distichlis spicata – low blue-green tufts',     targetW: 100 },
    { key: 'pickleweed', label: 'Pickleweed', desc: 'Salicornia pacifica – succulent red-green stems', targetW: 95 },
    { key: 'cordgrass',  label: 'Cordgrass',  desc: 'Spartina foliosa – tall arching blades',        targetW: 110 },
    { key: 'jaumea',     label: 'Jaumea',     desc: 'Jaumea carnosa – fleshy mat with tiny flowers', targetW: 90 },
];

export const GROWTH_STAGES = 8;
// Stage at which the plant counts as cover (rails can hide in it)
export const COVER_STAGE = 4;
// ms between growth steps — sprout to mature in ~1.5s
const STAGE_DELAY = 200;

export function plantTargetWidth(type) {
    return PLANT_TYPES.find(p => p.key === type)?.targetW || 100;
}

export class Plant extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type = 'gumplant') {
        const known = PLANT_TYPES.some(p => p.key === type);
        const plantType = known ? type : 'gumplant';
        super(scene, x, y, `${plantType}_1`);

        scene.add.existing(this);
        scene.physics.add.existing(this, true); // Static body

        this.plantType = plantType;
        this.growthStage = 1;

        this.baseScale = plantTargetWidth(plantType) / this.width;
        this.setScale(this.baseScale);
        this.setDepth(2);

        this.updateBody();

        // Step through growth stages, stopping at the mature frame
        this.growthTimer = scene.time.addEvent({
            delay: STAGE_DELAY,
            repeat: GROWTH_STAGES - 2, // stage 1 shown immediately, then 7 steps
            callback: () => this.advanceGrowth(),
        });

        // Emit dirt particles
        if (scene.particleManager) {
            scene.particleManager.emitDirt(x, y);
        }
    }

    advanceGrowth() {
        if (this.growthStage >= GROWTH_STAGES || !this.active) return;
        this.growthStage++;
        this.setTexture(`${this.plantType}_${this.growthStage}`);
        this.updateBody();

        if (this.growthStage >= GROWTH_STAGES) {
            // Mature: brief settle pop + dust
            this.scene.tweens.add({
                targets: this,
                scaleX: this.baseScale * 1.08,
                scaleY: this.baseScale * 1.08,
                duration: 120,
                yoyo: true,
                ease: 'Sine.easeOut',
                onComplete: () => this.setScale(this.baseScale),
            });
            if (this.scene.particleManager) {
                this.scene.particleManager.emitDirt(this.x, this.y);
            }
        }
    }

    /** Young sprouts are too small to hide a rail */
    isCover() {
        return this.growthStage >= COVER_STAGE;
    }

    updateBody() {
        if (!this.body) return;
        // Body tracks the shared canvas, bottom-anchored like the art
        const frac = this.growthStage / GROWTH_STAGES;
        const w = Math.max(24, this.width * (0.25 + 0.35 * frac));
        const h = Math.max(20, this.height * (0.2 + 0.3 * frac));
        this.body.setSize(w, h);
        this.body.setOffset((this.width - w) / 2, this.height - h - 4);
    }

    // Called when a rail enters this plant
    onRailEnter(rail) {
        if (!this.isCover() || rail.isSafe) return;
        rail.enterPlant();

        // Subtle plant reaction
        this.scene.tweens.add({
            targets: this,
            scaleX: this.baseScale * 1.1,
            scaleY: this.baseScale * 0.9,
            duration: 100,
            yoyo: true,
            onComplete: () => this.setScale(this.baseScale),
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

// Placement preview ghost – shows the mature frame of the next plant type
export class PlantPreview extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'gumplant_8');

        scene.add.existing(this);

        this.setAlpha(0.5);
        this.setTint(0x00ff00);
        this.setScale(plantTargetWidth('gumplant') / this.width);
        this.setDepth(10);
        this.setVisible(false);
    }

    /** Update which plant species the preview shows */
    setPlantType(typeKey) {
        const known = PLANT_TYPES.some(p => p.key === typeKey);
        const key = known ? typeKey : 'gumplant';
        this.setTexture(`${key}_${GROWTH_STAGES}`);
        this.setScale(plantTargetWidth(key) / this.width);
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
