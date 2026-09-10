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

test('GameScene cleans up levelStartElements and guards tutorialAdvancing', () => {
    const content = fs.readFileSync('src/scenes/GameScene.js', 'utf-8');

    assert.match(
        content,
        /this\.levelStartElements\s*=\s*\[levelText,\s*nameText\]/,
        'level banner text elements must be tracked for cleanup'
    );

    assert.match(
        content,
        /if\s*\(\s*this\.tutorialAdvancing\s*\)\s*return/,
        'completeTutorial must guard against multiple overlapping triggers'
    );
});

test('GameScene separates corridor hint vertically and wraps it in a readable background card', () => {
    const content = fs.readFileSync('src/scenes/GameScene.js', 'utf-8');

    assert.match(
        content,
        /const\s+msgY\s*=\s*bandY\s*\+\s*\(compact\s*\?\s*24\s*:\s*36\)/,
        'msgY must be placed below central bandY rather than overlapping bandY - 60'
    );

    assert.match(
        content,
        /card\.fillRoundedRect\s*\(/,
        'corridor hint must render with a readable rounded backdrop card'
    );

    assert.match(
        content,
        /Plant more to create a corridor to the safe zone/,
        'corridor hint text must be preserved'
    );
});
