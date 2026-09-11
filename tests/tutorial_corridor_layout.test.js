import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('GameScene sequences showLevelStart with onComplete callback to prevent text overlap', () => {
    const content = fs.readFileSync('src/scenes/GameScene.js', 'utf-8');

    assert.match(
        content,
        /showLevelStart\s*\(\s*config\s*,\s*onComplete\s*=\s*null\s*\)/,
        'showLevelStart must accept an onComplete callback parameter'
    );

    assert.match(
        content,
        /this\.showLevelStart\s*\(\s*config\s*,\s*\(\)\s*=>\s*\{/,
        'startLevel must pass a completion callback to showLevelStart'
    );
});

test('GameScene tracks level banners and guards tutorial completion', () => {
    const content = fs.readFileSync('src/scenes/GameScene.js', 'utf-8');

    assert.match(
        content,
        /this\.levelStartElements\s*=\s*\[levelText,\s*nameText\]/,
        'level banner text elements must be tracked for cleanup'
    );

    assert.match(
        content,
        /if\s*\(this\.tutorialAdvancing\s*\|\|\s*!this\.tutorialFlow\?\.completeDemonstration\(\)\)\s*return/,
        'completeTutorial must guard against multiple overlapping triggers'
    );
});
