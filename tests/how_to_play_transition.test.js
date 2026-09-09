import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const menuSceneRaw = fs.readFileSync('src/scenes/MenuScene.js', 'utf-8');

test('MenuScene removes standalone HOW TO PLAY menu button from start menu', () => {
    assert.doesNotMatch(menuSceneRaw, /createButton\([^,]+,[^,]+,\s*'HOW TO PLAY'/);
});

test('MenuScene shows only PLAY and SFBBO & VOLUNTEER buttons on the start menu', () => {
    const buttonLabels = [...menuSceneRaw.matchAll(/createButton\([^,]+,[^,]+,\s*'([^']+)'/g)].map(m => m[1]);
    assert.deepEqual(buttonLabels, ['PLAY', 'SFBBO & VOLUNTEER']);
});

test('MenuScene routes PLAY button through showTutorial before starting game', () => {
    assert.match(menuSceneRaw, /this\.showTutorial\(\s*\(\)\s*=>\s*this\.startGame\(\)\s*\)/);
    assert.match(menuSceneRaw, /startGame\s*\(\)\s*\{/);
    assert.match(menuSceneRaw, /this\.scene\.start\('IntroScene'\)/);
});

test('showTutorial supports onStart callback and countdown in buildModalClose', () => {
    assert.match(menuSceneRaw, /showTutorial\s*\(\s*onStart\s*=\s*null\s*\)/);
    assert.match(menuSceneRaw, /label:\s*onStart\s*\?\s*'START GAME'\s*:\s*'GOT IT'/);
    assert.match(menuSceneRaw, /countdown:\s*onStart\s*\?\s*5\s*:\s*0/);
});

test('buildModalClose implements countdown timer and cleans up on modal close', () => {
    assert.match(menuSceneRaw, /if\s*\(countdown\s*>\s*0\)/);
    assert.match(menuSceneRaw, /this\.time\.addEvent/);
    assert.match(menuSceneRaw, /timer\.remove\(false\)/);
});
