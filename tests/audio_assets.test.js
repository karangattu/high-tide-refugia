import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('ridgways rail call audio asset exists and has valid size', () => {
    const audioPath = 'public/assets/sprites/ridgways_rail_call.mp3';
    assert.ok(fs.existsSync(audioPath), `File ${audioPath} should exist`);
    const stats = fs.statSync(audioPath);
    assert.ok(stats.size > 100000, `Audio file should be non-empty (got ${stats.size} bytes)`);
});

test('BootScene preloads rail_call audio', () => {
    const bootSceneContent = fs.readFileSync('src/scenes/BootScene.js', 'utf-8');
    assert.match(
        bootSceneContent,
        /this\.load\.audio\(\s*['"]rail_call['"]\s*,\s*['"]assets\/sprites\/ridgways_rail_call\.mp3['"]\s*\)/,
        'BootScene must preload rail_call'
    );
});

test('GameScene wires up rail_call playback and lifecycle handlers', () => {
    const gameSceneContent = fs.readFileSync('src/scenes/GameScene.js', 'utf-8');
    assert.match(
        gameSceneContent,
        /this\.cache\.audio\.exists\('rail_call'\)/,
        'GameScene should check for rail_call in cache'
    );
    assert.match(
        gameSceneContent,
        /this\.railCallBgm\.play\(\)/,
        'GameScene should play background music'
    );
    assert.match(
        gameSceneContent,
        /this\.railCallBgm\.pause\(\)/,
        'GameScene should pause audio on togglePause'
    );
    assert.match(
        gameSceneContent,
        /this\.railCallBgm\.stop\(\)/,
        'GameScene should stop audio on shutdown'
    );
});
