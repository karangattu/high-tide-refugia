export function getStrategicCoverBonus(plantsPlaced, hasUsedCover) {
    if (!hasUsedCover || plantsPlaced < 5 || plantsPlaced > 16) return 0;
    if (plantsPlaced <= 8) return 150;
    if (plantsPlaced <= 12) return 100;
    return 50;
}

/**
 * Grade an unbroken habitat corridor running from the water edge to the safe
 * refuge. A corridor is connected when every neighbouring pair of cover plants
 * is at most `maxGap` px apart, beginning close to the waterline and ending
 * close to the refuge. Returns a compact summary for scoring and end screens.
 */
export function computeCorridorConnectivity(plants, options = {}) {
    const maxGap = options.maxGap ?? 120;
    const fromX = options.fromX ?? 0;
    const toX = options.toX ?? Infinity;
    const minX = options.minX ?? fromX;

    const xs = (plants || [])
        .map(p => (typeof p === 'number' ? p : (p?.x ?? null)))
        .filter(x => Number.isFinite(x) && x >= minX)
        .sort((a, b) => a - b);

    if (xs.length < 2) {
        return { connected: false, grade: 'D', maxGap: Infinity, plants: xs.length };
    }

    let worstGap = 0;
    for (let i = 1; i < xs.length; i++) {
        worstGap = Math.max(worstGap, xs[i] - xs[i - 1]);
    }
    const leadGap = xs[0] - fromX;
    const tailGap = toX - xs[xs.length - 1];
    const connected = worstGap <= maxGap && leadGap <= maxGap && tailGap <= maxGap;

    let grade;
    if (connected) {
        grade = Math.max(worstGap, leadGap, tailGap) <= maxGap * 0.7 ? 'A+' : 'A';
    } else if (worstGap <= maxGap * 1.4) {
        grade = 'B';
    } else if (worstGap <= maxGap * 2) {
        grade = 'C';
    } else {
        grade = 'D';
    }

    return { connected, grade, maxGap: worstGap, plants: xs.length };
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
        const strategicBonus = getStrategicCoverBonus(this.plantsPlaced, rail.hasUsedCover);
        const corridorPayout = (this.corridorConnected && rail.hasUsedCover)
            ? this.corridorBonus
            : 0;

        // Reward enough useful habitat to protect rails, while making dense
        // marsh carpeting less valuable than a small set of well-placed patches.
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
