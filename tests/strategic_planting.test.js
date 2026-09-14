import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ScoreManager, getStrategicCoverBonus, computeCorridorConnectivity } from '../src/systems/ScoreManager.js';

const plant = (x, y = 0, coverRadius = 40) => ({ x, y, coverRadius });
const route = { fromX: 0, toX: 240 };
function score(rail, count = 0) {
    const manager = new ScoreManager({});
    for (let i = 0; i < count; i++) manager.recordPlantPlaced();
    manager.railSaved(rail);
    return manager;
}

test('cover bonus rewards protected travel and caps the payout', () => {
    assert.equal(getStrategicCoverBonus(0, true), 0);
    assert.equal(getStrategicCoverBonus(80, true), 50);
    assert.equal(getStrategicCoverBonus(240, true), 150);
    assert.equal(getStrategicCoverBonus(10000, true), 150);
    assert.equal(getStrategicCoverBonus(240, false), 0);
});

test('useful cover keeps its bonus after planting more than sixteen patches', () => {
    const rail = { hasUsedCover: true, coveredDistance: 240 };
    assert.equal(score(rail, 5).score, 250);
    assert.equal(score(rail, 30).score, 250);
    assert.equal(score({ hasUsedCover: true, coveredDistance: 0 }, 30).score, 100);
});

test('only a rail that uses restored habitat or a connected route earns their bonuses', () => {
    assert.equal(score({ hasUsedCover: true, hasUsedReplacement: true }).score, 125);
    const manager = new ScoreManager({});
    manager.setCorridorStatus({ connected: true, grade: 'A' });
    manager.railSaved({ hasUsedCover: true });
    assert.equal(manager.score, 100, 'a corridor elsewhere does not reward this rail');
    const travelled = score({ hasUsedCover: true, hasUsedCorridor: true });
    assert.equal(travelled.score, 175);
    assert.equal(travelled.greenCorridorSaves, 1);
});

test('corridor requires touching cover circles across both horizontal and vertical gaps', () => {
    const straight = [plant(40), plant(120), plant(200)];
    assert.equal(computeCorridorConnectivity(straight, route).connected, true);
    assert.equal(computeCorridorConnectivity([plant(40), plant(120, 200), plant(200)], route).connected, false);
    assert.equal(computeCorridorConnectivity([plant(40), plant(121), plant(201)], route).connected, false);
});

test('corridor can follow a diagonal branch without disconnected plants breaking the route', () => {
    const path = [plant(30, 0, 50), plant(100, 50, 50), plant(170, 0, 50), plant(220, 0, 50)];
    const result = computeCorridorConnectivity([path[2], plant(105, 400), path[0], path[3], path[1]], route);
    assert.equal(result.connected, true);
    assert.ok(result.path.every(p => path.includes(p)));
    for (let i = 1; i < result.path.length; i++) {
        const a = result.path[i - 1], b = result.path[i];
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) <= a.coverRadius + b.coverRadius);
    }
});

test('both ends must reach the water-side entry and refuge', () => {
    assert.equal(computeCorridorConnectivity([plant(70), plant(140), plant(210)], route).connected, false);
    assert.equal(computeCorridorConnectivity([plant(40), plant(110), plant(180)], route).connected, false);
    assert.equal(computeCorridorConnectivity([], route).connected, false);
    assert.equal(computeCorridorConnectivity([plant(NaN), plant(40)], route).connected, false);
});

test('a drowned gap breaks the corridor; a replacement can reconnect it', () => {
    const patches = [plant(40), plant(120), plant(200)];
    assert.equal(computeCorridorConnectivity(patches, route).connected, true);
    patches.splice(1, 1);
    assert.equal(computeCorridorConnectivity(patches, route).connected, false);
    patches.push(plant(120));
    assert.equal(computeCorridorConnectivity(patches, route).connected, true);
});

test('reset clears habitat stats and score for a new run', () => {
    const manager = score({ hasUsedCover: true, coveredDistance: 240 }, 30);
    manager.reset();
    assert.equal(manager.score, 0);
    assert.equal(manager.plantsPlaced, 0);
    assert.equal(manager.strategicSaves, 0);
});
