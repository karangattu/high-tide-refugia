import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const menuSceneRaw = fs.readFileSync('src/scenes/MenuScene.js', 'utf-8');

test('MenuScene removes legacy CREDITS button and method', () => {
    assert.doesNotMatch(menuSceneRaw, /'CREDITS'/);
    assert.doesNotMatch(menuSceneRaw, /showCredits\s*\(/);
});

test('MenuScene includes SFBBO & VOLUNTEER button and showSFBBOInfo method', () => {
    assert.match(menuSceneRaw, /'SFBBO & VOLUNTEER'/);
    assert.match(menuSceneRaw, /showSFBBOInfo\s*\(/);
});

test('MenuScene includes official SFBBO tidal marsh and volunteer program URLs', () => {
    assert.match(menuSceneRaw, /https:\/\/www\.sfbbo\.org\/tidalmarsh\//);
    assert.match(menuSceneRaw, /https:\/\/www\.sfbbo\.org\/volunteer\//);
});

test('MenuScene provides context on tidal marsh transition zones and high-tide refugia for rails', () => {
    assert.match(menuSceneRaw, /Tidal Marsh Program/i);
    assert.match(menuSceneRaw, /transition zones/i);
    assert.match(menuSceneRaw, /high-tide refugia/i);
    assert.match(menuSceneRaw, /Ridgway's Rails/i);
    assert.match(menuSceneRaw, /propagate native plants/i);
});

test('MenuScene wires interactive link buttons to window.open with secure rel attributes', () => {
    assert.match(menuSceneRaw, /createModalLinkButton\s*\(/);
    assert.match(menuSceneRaw, /window\.open\(url,\s*'_blank',\s*'noopener,noreferrer'\)/);
});

test('buildModalShell creates fully opaque panel and toggles menu button visibility', () => {
    assert.match(menuSceneRaw, /panel\.fillStyle\(0x0e2319,\s*1\.0\)/);
    assert.match(menuSceneRaw, /this\.setMenuButtonsVisible\(false\)/);
    assert.match(menuSceneRaw, /this\.setMenuButtonsVisible\(true\)/);
    assert.match(menuSceneRaw, /panelBlocker/);
});

test('showSFBBOInfo and showTutorial use content-driven height and explicit close button positioning', () => {
    assert.match(menuSceneRaw, /totalH\s*=/);
    assert.match(menuSceneRaw, /buildModalShell\([^)]+totalH\)/);
    assert.match(menuSceneRaw, /buildModalClose\([^)]+y:\s*closeY/);
});
