import * as Phaser from 'phaser';

// All available marsh-plant species. Growth art comes from
// `{key}_sprite_sheet.png` (8 stages, sprout → mature), sliced in
// BootScene into `{key}_1..{key}_8`. targetW is the mature on-screen
// width in pixels; smaller species read as low ground cover.
export const PLANT_TYPES = [
    { key: 'cordgrass',  label: 'Cordgrass',  zone: 'Low Marsh',         desc: 'Spartina foliosa – tidal mudflats & low marsh',    trait: 'Water Resistance',  targetW: 110 },
    { key: 'pickleweed', label: 'Pickleweed', zone: 'Mid Marsh',         desc: 'Salicornia pacifica – mid marsh succulent plain',  trait: 'Tangle Mat',        targetW: 95 },
    { key: 'jaumea',     label: 'Jaumea',     zone: 'Marsh Plain',       desc: 'Jaumea carnosa – moist depressions & saline mats', trait: 'Quick Sprout',      targetW: 90 },
    { key: 'saltgrass',  label: 'Saltgrass',  zone: 'High Marsh',        desc: 'Distichlis spicata – tough high-marsh sod',        trait: 'Rhizome Resilience', targetW: 100 },
    { key: 'gumplant',   label: 'Gumplant',   zone: 'High-Tide Refugia', desc: 'Grindelia stricta – tall bushes & upland refugia', trait: 'True Refugia',      targetW: 110 },
];

export const MARSH_ZONES = PLANT_TYPES;

export const GROWTH_STAGES = 8;
export const COVER_STAGE = 4;
const STAGE_DELAY = 200;

// Ecological traits that differentiate each native species. All values are
// multipliers/costs applied on top of the shared baseline above.
//  - growthSpeed:   1 = normal, 2 = grows in half the time
//  - coverRadius:   hide radius a rail must be inside to be sheltered
//  - groundSlow:    speed multiplier applied to ground predators crossing it
//  - waterGrace:    ms of cover retained after the tide submerges the plant
//                   (and the extra drowning grace it grants a sheltering rail)
//  - seedRefund:    seeds granted back when the plant reaches maturity
//  - seedRefundChance: probability the refund fires, so a species can never
//                   pay for itself and create free/infinite planting
export const DEFAULT_PLANT_TRAITS = {
    growthSpeed: 1,
    coverRadius: 35,
    groundSlow: 1,
    waterGrace: 0,
    seedRefund: 0,
    seedRefundChance: 0,
};

export const PLANT_TRAITS = {
    cordgrass:  { growthSpeed: 1, coverRadius: 38, groundSlow: 1,    waterGrace: 4000, seedRefund: 0, seedRefundChance: 0 },
    pickleweed: { growthSpeed: 1, coverRadius: 36, groundSlow: 0.75, waterGrace: 0,    seedRefund: 0, seedRefundChance: 0 },
    jaumea:     { growthSpeed: 2, coverRadius: 34, groundSlow: 1,    waterGrace: 0,    seedRefund: 0, seedRefundChance: 0 },
    // Rhizome resilience: a 35% chance to return one seed on maturity, so a
    // single planting yields on average 0.35 seeds back — never a free plant.
    saltgrass:  { growthSpeed: 1, coverRadius: 40, groundSlow: 0.9,  waterGrace: 0,    seedRefund: 1, seedRefundChance: 0.35 },
    gumplant:   { growthSpeed: 1, coverRadius: 58, groundSlow: 1,    waterGrace: 0,    seedRefund: 0, seedRefundChance: 0 },
};

export function getPlantTraits(type) {
    return PLANT_TRAITS[type] || DEFAULT_PLANT_TRAITS;
}

export function plantTargetWidth(type) {
    return PLANT_TYPES.find(p => p.key === type)?.targetW || 100;
}

export function getPlantZoneForX(x, sceneWidth) {
    const minX = 60;
    const maxX = Math.max(minX + 100, sceneWidth - 150);
    const u = Math.min(Math.max((x - minX) / (maxX - minX), 0), 0.999);
    if (u < 0.20) return PLANT_TYPES[0];
    if (u < 0.40) return PLANT_TYPES[1];
    if (u < 0.60) return PLANT_TYPES[2];
    if (u < 0.80) return PLANT_TYPES[3];
    return PLANT_TYPES[4];
}

export function getPlantTypeForX(x, sceneWidth) {
    return getPlantZoneForX(x, sceneWidth).key;
}

export class Plant extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type = 'gumplant') {
        const known = PLANT_TYPES.some(p => p.key === type);
        const plantType = known ? type : 'gumplant';
        super(scene, x, y, `${plantType}_1`);

        scene.add.existing(this);
        scene.physics.add.existing(this, true); // Static body

        this.plantType = plantType;
        this.traits = getPlantTraits(plantType);
        this.coverRadius = this.traits.coverRadius;
        this.growthStage = 1;

        // Submersion state driven by the rising tide (see updateWater)
        this.submerged = false;
        this.submergedAt = 0;
        this.coverOK = true;
        this.refunded = false;

        this.baseScale = plantTargetWidth(plantType) / this.width;
        this.setScale(this.baseScale);
        this.setDepth(2);

        this.updateBody();

        // Step through growth stages, stopping at the mature frame.
        // Fast-sprouting species (Jaumea) use a shorter delay.
        this.growthTimer = scene.time.addEvent({
            delay: Math.max(60, Math.round(STAGE_DELAY / this.traits.growthSpeed)),
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
            this.grantMaturityRefund();
        }
    }

    /**
     * Saltgrass rhizomes occasionally return a seed once the turf is
     * established. It is a *chance* refund, so planting can never pay for
     * itself and be repeated for free.
     */
    grantMaturityRefund() {
        if (this.refunded) return;
        this.refunded = true;

        const amount = this.traits.seedRefund;
        if (!amount || amount <= 0) return;
        const chance = this.traits.seedRefundChance ?? 0;
        if (Math.random() >= chance) return;

        const seedBank = this.scene?.seedBank;
        if (!seedBank) return;
        seedBank.addSeeds(amount);
        this.scene.particleManager?.emitPlusOne?.(this.x, this.y, `+${amount} SEED`);
    }

    /**
     * Track how the advancing waterline affects this plant. Submerged plants
     * stop hiding rails immediately, except water-resistant Cordgrass which
     * keeps its cover for a few extra seconds.
     */
    updateWater(waterX, time) {
        if (!this.active) return;
        const under = waterX > this.x;
        if (under && !this.submerged) {
            this.submerged = true;
            this.submergedAt = time;
        } else if (!under) {
            this.submerged = false;
        }

        if (!under) {
            this.coverOK = true;
        } else if (this.traits.waterGrace > 0) {
            this.coverOK = (time - this.submergedAt) < this.traits.waterGrace;
        } else {
            this.coverOK = false;
        }
    }

    /** Ground predators bog down when crossing a dense pickleweed mat. */
    getGroundSlowFactor() {
        return this.traits.groundSlow;
    }

    /** Young sprouts are too small to hide a rail (or are flooded out). */
    isCover() {
        return this.growthStage >= COVER_STAGE && this.coverOK;
    }

    getCoverRadius() {
        return this.coverRadius;
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

export class PlantPreview extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'cordgrass_8');

        scene.add.existing(this);

        this.setAlpha(0.5);
        this.setTint(0x00ff00);
        this.setScale(plantTargetWidth('cordgrass') / this.width);
        this.setDepth(10);
        this.setVisible(false);

        this.currentType = 'cordgrass';
        this.labelBg = scene.add.graphics().setDepth(11).setVisible(false);
        this.labelText = scene.add.text(x, y - 40, '', {
            fontFamily: 'Mona Sans',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: window.devicePixelRatio || 2,
        }).setOrigin(0.5).setDepth(12).setVisible(false);

        this.traitText = scene.add.text(x, y - 26, '', {
            fontFamily: 'Mona Sans',
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#f1c40f',
            resolution: window.devicePixelRatio || 2,
        }).setOrigin(0.5).setDepth(12).setVisible(false);

        this.once('destroy', () => {
            if (this.labelBg) this.labelBg.destroy();
            if (this.labelText) this.labelText.destroy();
            if (this.traitText) this.traitText.destroy();
            this.labelBg = null;
            this.labelText = null;
            this.traitText = null;
        });
    }

    setPlantType(typeKey) {
        const entry = PLANT_TYPES.find(p => p.key === typeKey) || PLANT_TYPES[0];
        if (this.currentType !== entry.key) {
            this.currentType = entry.key;
            this.setTexture(`${entry.key}_${GROWTH_STAGES}`);
            this.setScale(plantTargetWidth(entry.key) / this.width);
        }
        if (this.labelText) {
            this.labelText.setText(`${entry.label} · ${entry.zone}`);
        }
        if (this.traitText) {
            this.traitText.setText(entry.trait || '');
        }
    }

    show(x, y, canPlace = true) {
        this.setPosition(x, y);
        this.setVisible(true);
        this.setTint(canPlace ? 0x00ff00 : 0xff0000);

        if (this.labelText && this.labelBg) {
            const ly = y - 44;
            const hasTrait = this.traitText && this.traitText.text;
            this.labelText.setPosition(x, hasTrait ? y - 48 : ly);
            this.labelText.setVisible(true);
            if (hasTrait) {
                this.traitText.setPosition(x, y - 34);
                this.traitText.setVisible(true);
            }

            const baseW = this.labelText.width + 16;
            const textW = hasTrait
                ? Math.max(baseW, this.traitText.width + 16)
                : baseW;
            const textH = hasTrait ? this.labelText.height + this.traitText.height + 10 : this.labelText.height + 6;
            const bgTop = hasTrait ? y - 56 : ly - textH / 2;
            this.labelBg.clear();
            this.labelBg.fillStyle(0x07150c, canPlace ? 0.88 : 0.70);
            this.labelBg.lineStyle(1, canPlace ? 0x2ecc71 : 0xe74c3c, 0.75);
            this.labelBg.fillRoundedRect(x - textW / 2, bgTop, textW, textH, 6);
            this.labelBg.strokeRoundedRect(x - textW / 2, bgTop, textW, textH, 6);
            this.labelBg.setVisible(true);
        }
    }

    hide() {
        this.setVisible(false);
        if (this.labelText) this.labelText.setVisible(false);
        if (this.traitText) this.traitText.setVisible(false);
        if (this.labelBg) this.labelBg.setVisible(false);
    }
}
