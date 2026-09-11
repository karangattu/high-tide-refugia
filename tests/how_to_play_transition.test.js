import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const menuSceneRaw = fs.readFileSync('src/scenes/MenuScene.js', 'utf-8');
const introSceneRaw = fs.readFileSync('src/scenes/IntroScene.js', 'utf-8');
const gameSceneRaw = fs.readFileSync('src/scenes/GameScene.js', 'utf-8');

test('MenuScene removes standalone HOW TO PLAY menu button from start menu', () => {
    assert.doesNotMatch(menuSceneRaw, /createButton\([^,]+,[^,]+,\s*'HOW TO PLAY'/);
});

test('MenuScene shows only PLAY and SFBBO & VOLUNTEER buttons on the start menu', () => {
    const buttonLabels = [...menuSceneRaw.matchAll(/createButton\([^,]+,[^,]+,\s*'([^']+)'/g)].map(m => m[1]);
    assert.deepEqual(buttonLabels, ['PLAY', 'SFBBO & VOLUNTEER']);
});

test('MenuScene starts the intro directly instead of showing a redundant instruction modal', () => {
    assert.doesNotMatch(menuSceneRaw, /showTutorial\s*\(/);
    assert.match(menuSceneRaw, /'PLAY'[\s\S]{0,220}?this\.startGame\(\)/);
    assert.match(menuSceneRaw, /startGame\s*\(\)\s*\{/);
    assert.match(menuSceneRaw, /this\.scene\.start\('IntroScene'\)/);
});

test('IntroScene hands first-time players to the interactive tutorial before waves begin', () => {
    assert.match(introSceneRaw, /this\.scene\.start\('GameScene'\)/);
    assert.match(gameSceneRaw, /this\.spawnTutorialPredator\(\);\s*this\.startTutorial\(\);\s*return;/);
    assert.match(gameSceneRaw, /finishTutorial\(\)[\s\S]*?this\.launchFullGame\(/);
});

test('buildModalClose implements countdown timer and cleans up on modal close', () => {
    assert.match(menuSceneRaw, /if\s*\(countdown\s*>\s*0\)/);
    assert.match(menuSceneRaw, /this\.time\.addEvent/);
    assert.match(menuSceneRaw, /timer\.remove\(false\)/);
});
