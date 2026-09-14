import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LevelManager, WAVE_PROFILES } from '../src/systems/LevelManager.js';

test('eight waves introduce distinct challenges with seed recovery after the shortage', () => {
    const manager = new LevelManager({});
    manager.startLevel();
    for (let wave = 1; wave <= 8; wave++) {
        const result = manager.startNextWave();
        assert.equal(result.waveNumber, wave);
        assert.equal(result.railsToSpawn, 5 + Math.floor((wave - 1) / 2));
        assert.equal(manager.getWaveProfile(), WAVE_PROFILES[wave - 1]);
        assert.ok(manager.getWaveProfile().hint.length > 0);
    }
    assert.equal(manager.isLevelComplete(), true);
    assert.equal(new Set(WAVE_PROFILES.map(w => w.name)).size, 8);
    assert.equal(WAVE_PROFILES[0].harriers, 0);
    assert.equal(WAVE_PROFILES[0].cats, 0);
    assert.equal(WAVE_PROFILES[1].cats, 1);
    assert.equal(WAVE_PROFILES[1].catVisionRange, 110);
    assert.equal(WAVE_PROFILES[1].lane, 'alternating');
    assert.equal(WAVE_PROFILES[3].paired, true);
    assert.ok(WAVE_PROFILES[4].regen < WAVE_PROFILES[3].regen);
    assert.equal(WAVE_PROFILES[5].regen, WAVE_PROFILES[0].regen);
    assert.equal(WAVE_PROFILES[5].harriers, 1);
    manager.startLevel();
    assert.equal(manager.getWaveProfile(), WAVE_PROFILES[0]);
});
