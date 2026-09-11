import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LevelManager } from '../src/systems/LevelManager.js';

const uiSceneContent = fs.readFileSync('src/scenes/UIScene.js', 'utf-8');

test('Center HUD renders a labeled wave progress bar', () => {
    assert.match(
        uiSceneContent,
        /refreshWaveProgress\(\)\s*\{/,
        'UIScene must implement refreshWaveProgress'
    );

    assert.match(
        uiSceneContent,
        /this\.waveBarGraphics\s*=\s*this\.add\.graphics\(\)/,
        'createHeaderStatus must create the wave progress graphics'
    );

    assert.match(
        uiSceneContent,
        /createHudCounter\([\s\S]*?'SAVED'/,
        'center HUD must render a labeled SAVED counter'
    );

    assert.match(
        uiSceneContent,
        /createHudCounter\([\s\S]*?'LOST'/,
        'center HUD must render a labeled LOST counter'
    );

    assert.match(
        uiSceneContent,
        /update\(time, delta\)\s*\{[\s\S]*?this\.refreshWaveProgress\(\)/,
        'UIScene.update must refresh the wave progress bar'
    );
});

test('LevelManager exposes wave progress used by the HUD bar', () => {
    const manager = new LevelManager({});

    manager.startLevel();
    let progress = manager.getLevelProgress();
    assert.equal(progress.totalWaves, 8, 'single tide event has 8 waves');
    assert.equal(progress.wave, 0, 'wave counter starts at 0 before the first wave');
    assert.equal(progress.railsSpawned, 0);
    assert.ok(progress.railsToSpawn > 0, 'wave has rails to spawn');

    manager.startNextWave();
    assert.equal(manager.getLevelProgress().wave, 1, 'first wave becomes active');

    manager.recordRailSpawned();
    progress = manager.getLevelProgress();
    assert.equal(progress.railsSpawned, 1, 'spawned rails advance within-wave progress');
    assert.equal(progress.railsToSpawn, 5);
});

test('LevelManager schedules one mouse run on every third wave', () => {
    const manager = new LevelManager({});
    manager.startLevel();

    const mouseRuns = Array.from({ length: 8 }, () => (
        manager.startNextWave().shouldSpawnMouse
    ));

    assert.deepEqual(mouseRuns, [
        false, false, true, false, false, true, false, false,
    ]);
});
