import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ScoreManager, getStrategicCoverBonus } from '../src/systems/ScoreManager.js';

function createManager() {
    const popups = [];
    const scene = {
        particleManager: {
            emitScorePopup: (...args) => popups.push(args),
        },
    };

    return { manager: new ScoreManager(scene), popups };
}

test('strategic cover bonus rewards a sufficient, compact habitat plan', () => {
    assert.equal(getStrategicCoverBonus(4, true), 0, 'too little habitat earns no bonus');
    assert.equal(getStrategicCoverBonus(5, true), 150, 'five plants unlock the best bonus');
    assert.equal(getStrategicCoverBonus(8, true), 150, 'eight plants keep the best bonus');
    assert.equal(getStrategicCoverBonus(9, true), 100, 'extra vegetation reduces the efficiency bonus');
    assert.equal(getStrategicCoverBonus(13, true), 50, 'dense vegetation earns only a small bonus');
    assert.equal(getStrategicCoverBonus(17, true), 0, 'carpeting the marsh earns no efficiency bonus');
    assert.equal(getStrategicCoverBonus(6, false), 0, 'the rail must actually use planted cover');
});

test('saving a rail through five well-placed plants earns and reports Smart Cover', () => {
    const { manager, popups } = createManager();
    for (let i = 0; i < 5; i++) manager.recordPlantPlaced();

    manager.railSaved({ x: 20, y: 30, hasUsedCover: true });

    assert.equal(manager.score, 250);
    assert.equal(manager.getStats().strategicSaves, 1);
    assert.equal(manager.getStats().plantsPlaced, 5);
    assert.match(popups[0][2], /SMART COVER!/);
});

test('carpeting the marsh still saves a rail but does not earn the strategy bonus', () => {
    const { manager, popups } = createManager();
    for (let i = 0; i < 17; i++) manager.recordPlantPlaced();

    manager.railSaved({ x: 20, y: 30, hasUsedCover: true });

    assert.equal(manager.score, 100);
    assert.equal(manager.getStats().strategicSaves, 0);
    assert.doesNotMatch(popups[0][2], /SMART COVER!/);
});

test('reset clears plant-efficiency stats for a new run', () => {
    const { manager } = createManager();
    manager.recordPlantPlaced();
    manager.reset();

    assert.equal(manager.getStats().plantsPlaced, 0);
    assert.equal(manager.getStats().strategicSaves, 0);
});
