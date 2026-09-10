import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';

const gameSceneContent = fs.readFileSync('src/scenes/GameScene.js', 'utf-8');
const scoreManagerContent = fs.readFileSync('src/systems/ScoreManager.js', 'utf-8');

test('GameScene removes stale railCaught listeners before re-registering', () => {
    assert.match(
        gameSceneContent,
        /this\.events\.off\('railCaught',\s*this\.onRailCaught,\s*this\)[\s\S]*?this\.events\.on\('railCaught',\s*this\.onRailCaught,\s*this\)/,
        'setupCollisions must off() the previous railCaught handler before on() so restarts cannot stack listeners'
    );
});

test('railCaught uses a stable handler reference, not an inline closure', () => {
    assert.match(
        gameSceneContent,
        /onRailCaught\(rail\)\s*\{[\s\S]*?this\.scoreManager\.railLost\(rail,\s*'predator'\)/,
        'GameScene must define onRailCaught as a reusable method'
    );

    assert.doesNotMatch(
        gameSceneContent,
        /this\.events\.on\('railCaught',\s*\(rail\)\s*=>/,
        'railCaught must not use an inline closure that cannot be removed'
    );
});

test('repeated setupCollisions leaves exactly one railCaught handler', () => {
    const events = new EventEmitter();
    let railsLost = 0;

    const scene = {
        events,
        scoreManager: { railLost: () => { railsLost++; } },
        onRailCaught(rail) {
            this.scoreManager.railLost(rail, 'predator');
        },
    };
    scene.onRailCaught = scene.onRailCaught.bind(scene);

    const setupCollisions = () => {
        events.off('railCaught', scene.onRailCaught);
        events.on('railCaught', scene.onRailCaught);
    };

    // Simulate three successive games on the reused scene instance.
    setupCollisions();
    setupCollisions();
    setupCollisions();

    events.emit('railCaught', { id: 'rail-1' });

    assert.equal(railsLost, 1, 'a single caught rail must count once regardless of restarts');
    assert.equal(events.listenerCount('railCaught'), 1);
});

test('ScoreManager starts each game with railsLost at zero', () => {
    assert.match(
        scoreManagerContent,
        /constructor\(scene\)\s*\{[\s\S]*?this\.railsLost\s*=\s*0;/,
        'ScoreManager must initialize railsLost to 0'
    );

    assert.match(
        scoreManagerContent,
        /reset\(\)\s*\{[\s\S]*?this\.railsLost\s*=\s*0;/,
        'ScoreManager.reset must clear railsLost'
    );
});
