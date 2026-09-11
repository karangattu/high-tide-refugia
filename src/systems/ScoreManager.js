export function getStrategicCoverBonus(plantsPlaced, hasUsedCover) {
    if (!hasUsedCover || plantsPlaced < 5 || plantsPlaced > 16) return 0;
    if (plantsPlaced <= 8) return 150;
    if (plantsPlaced <= 12) return 100;
    return 50;
}

export class ScoreManager {
    constructor(scene) {
        this.scene = scene;
        this.score = 0;
        this.railsSaved = 0;
        this.railsLost = 0;
        this.strategicSaves = 0;
        this.plantsPlaced = 0;
        this.currentCombo = 0;
        this.maxCombo = 0;

        // Score values
        this.baseRailScore = 100;
        this.comboMultiplier = 1;

        // Callbacks for UI updates
        this.onScoreUpdate = null;
        this.onStatsUpdate = null;
    }

    railSaved(rail) {
        this.railsSaved++;

        // Calculate score
        let points = this.baseRailScore * this.comboMultiplier;
        let bonusText = '';
        const strategicBonus = getStrategicCoverBonus(this.plantsPlaced, rail.hasUsedCover);

        // Reward enough useful habitat to protect rails, while making dense
        // marsh carpeting less valuable than a small set of well-placed patches.
        if (strategicBonus > 0) {
            points += strategicBonus;
            this.strategicSaves++;
            bonusText = '\nSMART COVER!';

            // Increase combo
            this.currentCombo++;
            if (this.currentCombo > this.maxCombo) {
                this.maxCombo = this.currentCombo;
            }

            // Update multiplier
            this.comboMultiplier = 1 + (this.currentCombo * 0.1);
        } else {
            // Reset combo when the current habitat plan earns no efficiency bonus.
            this.currentCombo = 0;
            this.comboMultiplier = 1;
        }

        this.score += Math.floor(points);

        // Visual feedback
        if (this.scene.particleManager) {
            const scoreText = `+${Math.floor(points)}${bonusText}`;
            const color = strategicBonus > 0 ? '#f1c40f' : '#27ae60';
            this.scene.particleManager.emitScorePopup(rail.x, rail.y, scoreText, color);
        }

        this.notifyUpdate();
    }

    recordPlantPlaced() {
        this.plantsPlaced++;
        this.notifyUpdate();
    }

    railLost(rail, cause = 'predator') {
        this.railsLost++;

        // Penalty
        const penalty = 50;
        this.score = Math.max(0, this.score - penalty);

        // Reset combo
        this.currentCombo = 0;
        this.comboMultiplier = 1;

        // Visual feedback
        if (this.scene.particleManager) {
            const text = cause === 'water' ? '-50' : '-50';
            this.scene.particleManager.emitScorePopup(rail.x, rail.y, text, '#e74c3c');
        }

        this.notifyUpdate();
    }

    getStats() {
        return {
            score: this.score,
            railsSaved: this.railsSaved,
            railsLost: this.railsLost,
            strategicSaves: this.strategicSaves,
            plantsPlaced: this.plantsPlaced,
            maxCombo: this.maxCombo,
            survivalRate: this.railsSaved / (this.railsSaved + this.railsLost) || 0,
        };
    }

    notifyUpdate() {
        if (this.onScoreUpdate) {
            this.onScoreUpdate(this.score, this.comboMultiplier);
        }
        if (this.onStatsUpdate) {
            this.onStatsUpdate(this.getStats());
        }
    }

    reset() {
        this.score = 0;
        this.railsSaved = 0;
        this.railsLost = 0;
        this.strategicSaves = 0;
        this.plantsPlaced = 0;
        this.currentCombo = 0;
        this.maxCombo = 0;
        this.comboMultiplier = 1;
        this.notifyUpdate();
    }
}
