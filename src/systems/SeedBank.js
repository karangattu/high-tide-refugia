export class SeedBank {
    constructor(scene, maxSeeds = 10, startSeeds = 8) {
        this.scene = scene;
        this.maxSeeds = maxSeeds;
        this.currentSeeds = startSeeds;
        this.regenRate = 0.5; // Seeds per second
        this.regenTimer = 0;
        this.plantCost = 1;

        // Callbacks for UI updates
        this.onUpdate = null;
    }

    update(delta) {
        // Regenerate seeds over time
        if (this.currentSeeds < this.maxSeeds) {
            this.regenTimer += delta;
            const regenTime = 1000 / this.regenRate;

            if (this.regenTimer >= regenTime) {
                this.regenTimer = 0;
                this.addSeeds(1);
            }
        }
    }

    canPlant() {
        return this.currentSeeds >= this.plantCost;
    }

    spendSeeds(amount = 1) {
        if (this.currentSeeds >= amount) {
            this.currentSeeds = Math.round(this.currentSeeds - amount);
            this.notifyUpdate();
            return true;
        }
        return false;
    }

    addSeeds(amount) {
        this.currentSeeds = Math.min(Math.round(this.currentSeeds + amount), this.maxSeeds);
        this.notifyUpdate();
    }

    collectFloatingSeed() {
        // Bonus seed from catching floating seeds
        this.addSeeds(1);

        // Visual feedback in scene
        if (this.scene.particleManager) {
            this.scene.particleManager.emitScorePopup(
                this.scene.scale.width / 2,
                100,
                '+1 SEED',
                '#f39c12'
            );
        }
    }

    getPercentage() {
        return this.currentSeeds / this.maxSeeds;
    }

    setRegenRate(rate) {
        this.regenRate = rate;
    }

    notifyUpdate() {
        if (this.onUpdate) {
            this.onUpdate(this.currentSeeds, this.maxSeeds);
        }
    }

    reset() {
        this.currentSeeds = Math.round(this.maxSeeds * 0.8);
        this.regenTimer = 0;
        this.notifyUpdate();
    }
}
