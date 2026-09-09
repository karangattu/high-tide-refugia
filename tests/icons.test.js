import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ICON_DEFINITIONS, registerLucideIconTextures } from '../src/utils/icons.js';

const REQUIRED_ICONS = [
    'icon_trophy',
    'icon_heart_green',
    'icon_heart_broken',
    'icon_leaf',
    'icon_sprout',
    'icon_flame',
    'icon_wave',
    'icon_paw',
    'icon_bolt',
    'icon_target',
    'icon_star',
    'icon_maximize',
    'icon_alert',
    'icon_external_link',
];

test('ICON_DEFINITIONS defines all required Lucide icons with valid nodes and sizes', () => {
    for (const key of REQUIRED_ICONS) {
        assert.ok(key in ICON_DEFINITIONS, `Missing icon definition: ${key}`);
        const def = ICON_DEFINITIONS[key];
        assert.ok(Array.isArray(def.nodes) && def.nodes.length > 0, `${key} nodes must be non-empty array`);
        assert.ok(typeof def.size === 'number' && def.size >= 24, `${key} size must be >= 24`);
        assert.ok(typeof def.color === 'string' && def.color.length > 0, `${key} color must be set`);
    }
});

test('registerLucideIconTextures handles missing or mock scene gracefully', () => {
    assert.doesNotThrow(() => registerLucideIconTextures(null));
    assert.doesNotThrow(() => registerLucideIconTextures({}));
    assert.doesNotThrow(() => registerLucideIconTextures({ textures: {} }));
});

test('BootScene imports and calls registerLucideIconTextures', () => {
    const bootSceneRaw = fs.readFileSync('src/scenes/BootScene.js', 'utf-8');
    assert.match(bootSceneRaw, /import\s*\{\s*registerLucideIconTextures\s*\}\s*from\s*['"]\.\.\/utils\/icons\.js['"]/);
    assert.match(bootSceneRaw, /registerLucideIconTextures\s*\(\s*this\s*\)/);
});

test('Game scenes and systems do not contain raw emojis', () => {
    const files = [
        'src/scenes/UIScene.js',
        'src/scenes/MenuScene.js',
        'src/scenes/BootScene.js',
        'src/systems/WaterSystem.js',
        'index.html',
    ];
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        assert.doesNotMatch(content, emojiRegex, `File ${file} should not contain emojis`);
    }
});

test('UIScene and MenuScene wire up Lucide maximize, leaf, sprout, and link icons', () => {
    const uiSceneRaw = fs.readFileSync('src/scenes/UIScene.js', 'utf-8');
    const menuSceneRaw = fs.readFileSync('src/scenes/MenuScene.js', 'utf-8');
    const waterSystemRaw = fs.readFileSync('src/systems/WaterSystem.js', 'utf-8');

    assert.match(uiSceneRaw, /'icon_maximize'/);
    assert.match(uiSceneRaw, /'icon_leaf'/);
    assert.match(menuSceneRaw, /'icon_external_link'/);
    assert.match(waterSystemRaw, /'icon_alert'/);
});
