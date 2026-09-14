/** Reward distance actually travelled under cover, independent of planting count. */
export function getStrategicCoverBonus(coveredDistance, hasUsedCover) {
    return hasUsedCover ? Math.min(150, Math.floor(coveredDistance / 40) * 25) : 0;
}

/** Find a continuous chain of overlapping shelter circles in two dimensions.
 * The returned path is also drawn in the marsh, so scoring and feedback agree.
 */
export function computeCorridorConnectivity(plants, { fromX = 0, toX = Infinity } = {}) {
    const nodes = (plants || []).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y)
        && Number.isFinite(p.coverRadius) && p.coverRadius > 0);
    const parents = new Map();
    const queue = [];
    for (const p of nodes) {
        if (p.x - p.coverRadius <= fromX && p.x + p.coverRadius >= fromX) {
            parents.set(p, null);
            queue.push(p);
        }
    }
    for (let i = 0; i < queue.length; i++) {
        const current = queue[i];
        if (current.x + current.coverRadius >= toX) {
            const path = [];
            for (let p = current; p; p = parents.get(p)) path.unshift(p);
            return { connected: true, grade: 'A', plants: nodes.length, path };
        }
        for (const next of nodes) {
            if (!parents.has(next) && Math.hypot(next.x - current.x, next.y - current.y)
                <= next.coverRadius + current.coverRadius) {
                parents.set(next, current);
                queue.push(next);
            }
        }
    }
    return { connected: false, grade: nodes.length ? 'C' : 'D', plants: nodes.length, path: [] };
}

export class ScoreManager {
    constructor(scene) {
        this.scene = scene;
        this.score = 0;
        this.railsSaved = 0;
        this.railsLost = 0;
        this.waterDeaths = 0;
        this.predatorDeaths = 0;
        this.strategicSaves = 0;
        this.greenCorridorSaves = 0;
        this.plantsPlaced = 0;
        this.speciesPlanted = new Set();
        this.corridorConnected = false;
        this.corridorGrade = 'D';
        this.currentCombo = 0;
        this.maxCombo = 0;

        // Score values
        this.baseRailScore = 100;
        this.comboMultiplier = 1;
        this.corridorBonus = 75;

        // Callbacks for UI updates
        this.onScoreUpdate = null;
        this.onStatsUpdate = null;
    }

    railSaved(rail) {
        this.railsSaved++;

        // Calculate score
        let points = this.baseRailScore * this.comboMultiplier;
        const bonusLines = [];
        const strategicBonus = getStrategicCoverBonus(rail.coveredDistance || 0, rail.hasUsedCover);
        const corridorPayout = (rail.hasUsedCorridor && rail.hasUsedCover)
            ? this.corridorBonus
            : 0;

        // Bonuses are earned by this rail's journey, including restored habitat.
        if (rail.hasUsedReplacement) {
            points += 25;
            bonusLines.push('HABITAT RENEWED!');
        }
        if (strategicBonus > 0) {
            points += strategicBonus;
            this.strategicSaves++;
            bonusLines.push('SMART COVER!');
        }

        if (corridorPayout > 0) {
            points += corridorPayout;
            this.greenCorridorSaves++;
            bonusLines.push('GREEN CORRIDOR!');
        }

        if (strategicBonus > 0 || corridorPayout > 0) {
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
            const label = bonusLines.length ? `\n${bonusLines.join(' ')}` : '';
            const scoreText = `+${Math.floor(points)}${label}`;
            const color = bonusLines.length ? '#f1c40f' : '#27ae60';
            this.scene.particleManager.emitScorePopup(rail.x, rail.y, scoreText, color);
        }

        this.notifyUpdate();
    }

    recordPlantPlaced(type = null) {
        this.plantsPlaced++;
        if (type) this.speciesPlanted.add(type);
        this.notifyUpdate();
    }

    setCorridorStatus(status) {
        if (!status) return;
        this.corridorConnected = Boolean(status.connected);
        if (status.grade) this.corridorGrade = status.grade;
    }

    /** Bonus points from active play (Saltie sightings, debris pickups). */
    addBonus(points, x, y, label = '', color = '#f1c40f') {
        this.score += Math.max(0, Math.floor(points));
        if (this.scene.particleManager && label) {
            this.scene.particleManager.emitScorePopup(x, y, label, color);
        }
        this.notifyUpdate();
        return points;
    }

    railLost(rail, cause = 'predator') {
        this.railsLost++;
        if (cause === 'water') this.waterDeaths++;
        else this.predatorDeaths++;

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
        const totalOutcomes = this.railsSaved + this.railsLost;
        const tideOutcomes = this.railsSaved + this.waterDeaths;
        return {
            score: this.score,
            railsSaved: this.railsSaved,
            railsLost: this.railsLost,
            waterDeaths: this.waterDeaths,
            predatorDeaths: this.predatorDeaths,
            strategicSaves: this.strategicSaves,
            greenCorridorSaves: this.greenCorridorSaves,
            plantsPlaced: this.plantsPlaced,
            speciesCount: this.speciesPlanted.size,
            speciesPlanted: Array.from(this.speciesPlanted),
            corridorConnected: this.corridorConnected,
            corridorGrade: this.corridorGrade,
            maxCombo: this.maxCombo,
            survivalRate: totalOutcomes > 0 ? this.railsSaved / totalOutcomes : 0,
            tideSurvivalRate: tideOutcomes > 0 ? this.railsSaved / tideOutcomes : 0,
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
        this.waterDeaths = 0;
        this.predatorDeaths = 0;
        this.strategicSaves = 0;
        this.greenCorridorSaves = 0;
        this.plantsPlaced = 0;
        this.speciesPlanted.clear();
        this.corridorConnected = false;
        this.corridorGrade = 'D';
        this.currentCombo = 0;
        this.maxCombo = 0;
        this.comboMultiplier = 1;
        this.notifyUpdate();
    }
}
