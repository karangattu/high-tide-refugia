import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ScoreManager } from '../src/systems/ScoreManager.js';
import { audioFx } from '../src/utils/audioFx.js';

test('ScoreManager records narrow escape bonus and notifies visual popup', () => {
    let popupCalled = false;
    const mockScene = {
        particleManager: {
            emitScorePopup: (x, y, label, color) => {
                popupCalled = true;
                assert.equal(x, 120);
                assert.equal(y, 250);
                assert.match(label, /NARROW ESCAPE/);
                assert.equal(color, '#f39c12');
            },
        },
    };

    const scoreManager = new ScoreManager(mockScene);
    const rail = { x: 120, y: 250 };
    const initialScore = scoreManager.score;

    scoreManager.recordNarrowEscape(rail);
    assert.equal(scoreManager.score, initialScore + 75);
    assert.equal(popupCalled, true);
});

test('ScoreManager records predator diverted bonus and notifies visual popup', () => {
    let popupCalled = false;
    const mockScene = {
        particleManager: {
            emitScorePopup: (x, y, label, color) => {
                popupCalled = true;
                assert.equal(x, 300);
                assert.equal(y, 180);
                assert.match(label, /DIVERTED/);
                assert.equal(color, '#3498db');
            },
        },
    };

    const scoreManager = new ScoreManager(mockScene);
    const initialScore = scoreManager.score;

    scoreManager.recordPredatorDiverted(300, 180);
    assert.equal(scoreManager.score, initialScore + 50);
    assert.equal(popupCalled, true);
});

test('ScoreManager records tide dodger bonus for close-shave escapes', () => {
    let popupCalled = false;
    const mockScene = {
        particleManager: {
            emitScorePopup: (x, y, label, color) => {
                popupCalled = true;
                assert.equal(x, 880);
                assert.equal(y, 320);
                assert.match(label, /TIDE DODGER/);
                assert.equal(color, '#00cec9');
            },
        },
    };

    const scoreManager = new ScoreManager(mockScene);
    const rail = { x: 880, y: 320 };
    const initialScore = scoreManager.score;

    scoreManager.recordTideDodger(rail);
    assert.equal(scoreManager.score, initialScore + 50);
    assert.equal(popupCalled, true);
});

test('ScoreManager awards 300 pts and 3 seeds for flawless wave, resets wave counter', () => {
    const scoreManager = new ScoreManager({});
    scoreManager.startWave();
    assert.equal(scoreManager.waveRailsLost, 0);

    const flawlessResult = scoreManager.recordWaveClear(1);
    assert.equal(flawlessResult.isPerfect, true);
    assert.equal(flawlessResult.points, 300);
    assert.equal(flawlessResult.bonusSeeds, 3);
    assert.equal(scoreManager.score, 300);
    assert.equal(scoreManager.waveRailsLost, 0);

    scoreManager.railLost({ x: 10, y: 10 }, 'predator');
    assert.equal(scoreManager.waveRailsLost, 1);

    const imperfectResult = scoreManager.recordWaveClear(2);
    assert.equal(imperfectResult.isPerfect, false);
    assert.equal(imperfectResult.points, 100);
    assert.equal(imperfectResult.bonusSeeds, 1);
    assert.equal(scoreManager.score, 350);
    assert.equal(scoreManager.waveRailsLost, 0);
});

test('audioFx methods run safely in headless / non-browser environments without errors', () => {
    assert.doesNotThrow(() => {
        audioFx.playPlant();
        audioFx.playSeedCollect();
        audioFx.playDodge();
        audioFx.playDivert();
        audioFx.playRefuge();
        audioFx.playWaveClear();
    });
});

test('predators and floating seeds wire up gameplay enhancements and audio triggers', () => {
    const catContent = fs.readFileSync('src/entities/predators/Cat.js', 'utf-8');
    const foxContent = fs.readFileSync('src/entities/predators/Fox.js', 'utf-8');
    const harrierContent = fs.readFileSync('src/entities/predators/Harrier.js', 'utf-8');
    const seedsContent = fs.readFileSync('src/systems/FloatingSeeds.js', 'utf-8');
    const gameSceneContent = fs.readFileSync('src/scenes/GameScene.js', 'utf-8');

    assert.match(catContent, /recordPredatorDiverted/, 'Cat must record predator diverted when distracted while chasing');
    assert.match(catContent, /recordNarrowEscape/, 'Cat must record narrow escape when prey reaches cover');

    assert.match(foxContent, /recordPredatorDiverted/, 'Fox must record predator diverted when distracted while chasing');
    assert.match(foxContent, /recordNarrowEscape/, 'Fox must record narrow escape when prey reaches cover');

    assert.match(harrierContent, /recordNarrowEscape/, 'Harrier must record narrow escape when dive misses due to cover');

    assert.match(seedsContent, /audioFx\.playSeedCollect\(\)/, 'FloatingSeeds must play audio effect on collection');

    assert.match(gameSceneContent, /audioFx\.playPlant\(\)/, 'GameScene must play planting sound');
    assert.match(gameSceneContent, /recordTideDodger/, 'GameScene must record tide dodger in checkSafeZone');
    assert.match(gameSceneContent, /celebrateWaveClear/, 'GameScene must celebrate wave clear');
});
