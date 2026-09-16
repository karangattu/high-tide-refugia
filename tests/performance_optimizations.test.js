import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { computeCorridorConnectivity } from '../src/systems/ScoreManager.js';

const particleManagerContent = fs.readFileSync('src/effects/ParticleManager.js', 'utf-8');
const gameSceneContent = fs.readFileSync('src/scenes/GameScene.js', 'utf-8');
const catContent = fs.readFileSync('src/entities/predators/Cat.js', 'utf-8');
const foxContent = fs.readFileSync('src/entities/predators/Fox.js', 'utf-8');
const harrierContent = fs.readFileSync('src/entities/predators/Harrier.js', 'utf-8');

test('computeCorridorConnectivity with distance-squared optimization matches exact path connectivity', () => {
    const route = { fromX: 0, toX: 200 };
    const plants = [
        { x: 30, y: 100, coverRadius: 35 },
        { x: 90, y: 110, coverRadius: 35 },
        { x: 150, y: 100, coverRadius: 35 },
        { x: 210, y: 105, coverRadius: 35 },
    ];

    const result = computeCorridorConnectivity(plants, route);
    assert.equal(result.connected, true);
    assert.equal(result.grade, 'A');
    assert.equal(result.path.length, 4);

    const disconnectedPlants = [
        { x: 30, y: 100, coverRadius: 35 },
        { x: 120, y: 100, coverRadius: 35 },
        { x: 210, y: 100, coverRadius: 35 },
    ];
    const disconnectedResult = computeCorridorConnectivity(disconnectedPlants, route);
    assert.equal(disconnectedResult.connected, false);
});

test('ParticleManager implements popupPool for score popup recycling', () => {
    assert.match(particleManagerContent, /this\.popupPool\s*=\s*\[\];/);
    assert.match(particleManagerContent, /let popup\s*=\s*this\.popupPool\.pop\(\);/);
    assert.match(particleManagerContent, /this\.popupPool\.push\(popup\);/);
});

test('GameScene caches corridor connectivity and gates updates behind corridorDirty', () => {
    assert.match(gameSceneContent, /this\.corridorDirty\s*=\s*true;/);
    assert.match(gameSceneContent, /if\s*\(!this\.corridorDirty\s*&&\s*this\.corridorStatus\)\s*return;/);
    assert.match(gameSceneContent, /this\.corridorDirty\s*=\s*false;/);
});

test('Predators use bounding-box and distance-squared early rejections', () => {
    assert.match(catContent, /Math\.abs\(dx\)\s*>\s*this\.visionRange/);
    assert.match(catContent, /dx\s*\*\s*dx\s*\+\s*dy\s*\*\s*dy\s*<\s*radius\s*\*\s*radius/);
    assert.match(foxContent, /Math\.abs\(dx\)\s*>\s*this\.visionRange/);
    assert.match(foxContent, /dx\s*\*\s*dx\s*\+\s*dy\s*\*\s*dy\s*<\s*radius\s*\*\s*radius/);
    assert.match(harrierContent, /Math\.abs\(dx\)\s*>\s*this\.searchRadius/);
    assert.match(harrierContent, /dx\s*\*\s*dx\s*\+\s*dy\s*\*\s*dy\s*<\s*coverRadius\s*\*\s*coverRadius/);
});
