export class ScoreManager {
    constructor(scene) {
        this.scene = scene;
        this.score = 0;
        this.railsSaved = 0;
        this.railsLost = 0;
        this.perfectRuns = 0;
        this.currentCombo = 0;
        this.maxCombo = 0;

        // Score values
        this.baseRailScore = 100;
        this.perfectBonus = 200;
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

        // Perfect run bonus (never touched dirt)
        if (rail.isPerfectRun && !rail.touchedDirt) {
            points += this.perfectBonus;
            this.perfectRuns++;
            bonusText = '\nPERFECT COVER!';

            // Increase combo
            this.currentCombo++;
            if (this.currentCombo > this.maxCombo) {
                this.maxCombo = this.currentCombo;
            }

            // Update multiplier
            this.comboMultiplier = 1 + (this.currentCombo * 0.1);
        } else {
            // Reset combo on non-perfect
            this.currentCombo = 0;
            this.comboMultiplier = 1;
        }

        this.score += Math.floor(points);

        // Visual feedback
        if (this.scene.particleManager) {
            const scoreText = `+${Math.floor(points)}${bonusText}`;
            const color = rail.touchedDirt ? '#27ae60' : '#f1c40f';
            this.scene.particleManager.emitScorePopup(rail.x, rail.y, scoreText, color);
        }

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
            perfectRuns: this.perfectRuns,
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
        this.perfectRuns = 0;
        this.currentCombo = 0;
        this.maxCombo = 0;
        this.comboMultiplier = 1;
        this.notifyUpdate();
    }
}
