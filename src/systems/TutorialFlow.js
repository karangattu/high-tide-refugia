const DEFAULT_TARGET_RADIUS = 44;

export function createTutorialPlantTargets(left, right, y, count = 5) {
    if (count <= 1) return [{ id: 0, x: left, y }];
    const gap = (right - left) / (count - 1);
    return Array.from({ length: count }, (_, id) => ({
        id,
        x: left + gap * id,
        y,
    }));
}

export class TutorialFlow {
    constructor(targets) {
        this.targets = targets;
        this.claimedIds = new Set();
        this.placements = 0;
        this.stage = 'observe';
    }

    beginPlanting() {
        if (this.stage === 'observe') this.stage = 'plant';
    }

    findAvailableTarget(x, y, radius = DEFAULT_TARGET_RADIUS) {
        if (this.stage !== 'plant') return null;

        let nearest = null;
        let nearestDistance = radius;
        for (const target of this.targets) {
            if (this.claimedIds.has(target.id)) continue;
            const distance = Math.hypot(target.x - x, target.y - y);
            if (distance <= nearestDistance) {
                nearest = target;
                nearestDistance = distance;
            }
        }
        return nearest;
    }

    claimTarget(x, y, radius = DEFAULT_TARGET_RADIUS) {
        const target = this.findAvailableTarget(x, y, radius);
        if (!target) return null;

        this.claimedIds.add(target.id);
        this.placements++;
        if (this.placements >= this.targets.length) {
            this.stage = 'demonstrate';
        }
        return target;
    }

    completeDemonstration() {
        if (this.stage !== 'demonstrate') return false;
        this.stage = 'complete';
        return true;
    }
}
