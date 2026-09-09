import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

test('gray fox sprite sheet keeps the authored 4x4 sequence layout', () => {
    const spritePath = 'public/assets/sprites/gray_fox_sprite.png';
    assert.ok(fs.existsSync(spritePath), 'gray_fox_sprite.png must exist');

    const script = `
from PIL import Image
import numpy as np

img = Image.open('${spritePath}')
w, h = img.size
assert w == 4784 and h == 3584, f"Expected 4784x3584, got {w}x{h}"
assert w % 4 == 0 and h % 4 == 0
print(f'{w // 4}x{h // 4}')
`;
    const out = execSync('python3', { input: script }).toString().trim();
    assert.equal(out, '1196x896', 'The authored grid must divide into 1196x896 cells');
});

test('BootScene loads the fox art raw and slices away its embedded guide text', () => {
    const bootContent = fs.readFileSync('src/scenes/BootScene.js', 'utf-8');
    assert.match(
        bootContent,
        /this\.load\.image\(\s*['"]fox_sheet_raw['"],\s*['"]assets\/sprites\/gray_fox_sprite\.png['"]\s*\)/,
        'BootScene must load the full fox sheet as a raw source image'
    );
    assert.match(bootContent, /this\.sliceFoxSheet\(\)/, 'BootScene must slice clean gameplay textures from the source art');
    assert.match(bootContent, /fox_run_1/, 'BootScene must create named running textures');
    assert.match(bootContent, /fox_pounce_8/, 'BootScene must create the full pounce sequence');
});

test('Fox class implementation enforces diagonal movement, boundaries, and depth', () => {
    const foxContent = fs.readFileSync('src/entities/predators/Fox.js', 'utf-8');

    assert.match(foxContent, /this\.setDepth\(4\)/, 'Fox must be set to depth 4 (ground predator)');
    assert.match(foxContent, /this\.runningFrames\s*=\s*FOX_RUN_TEXTURES/, 'Fox uses all seven authored run poses');
    assert.match(foxContent, /this\.pounceFrames\s*=\s*FOX_POUNCE_TEXTURES/, 'Fox uses all eight authored pounce poses');
    assert.match(foxContent, /this\.state\s*===\s*['"]patrol['"]\s*\|\|\s*this\.state\s*===\s*['"]chase['"]/, 'Fox animates the run cycle while patrolling and chasing');
    assert.match(foxContent, /this\.resolvePounce\(\)/, 'Fox resolves the catch when the pounce reaches its contact frame');

    assert.match(foxContent, /Math\.cos\(this\.headingAngle\)/, 'Fox calculates diagonal horizontal velocity');
    assert.match(foxContent, /Math\.sin\(this\.headingAngle\)/, 'Fox calculates diagonal vertical velocity');

    assert.match(foxContent, /this\.y\s*<=\s*minY\s*&&\s*this\.patrolDirY\s*<\s*0/, 'Fox bounces off top marsh boundary');
    assert.match(foxContent, /this\.y\s*>=\s*maxY\s*&&\s*this\.patrolDirY\s*>\s*0/, 'Fox bounces off bottom marsh boundary');
    assert.match(foxContent, /this\.x\s*<=\s*safeWaterX\s*&&\s*this\.patrolDirX\s*<\s*0/, 'Fox bounces off water safe line');
    assert.match(foxContent, /this\.x\s*>=\s*maxMarshX\s*&&\s*this\.patrolDirX\s*>\s*0/, 'Fox bounces off upland refuge boundary');
});

test('Fox presentation scale keeps the larger predator visibly ahead of a rail', () => {
    const foxContent = fs.readFileSync('src/entities/predators/Fox.js', 'utf-8');
    const baseScale = Number(foxContent.match(/FOX_BASE_SCALE\s*=\s*([0-9.]+)/)?.[1]);

    assert.ok(baseScale >= 0.36, `Fox base scale (${baseScale}) should give its larger artwork a clear size lead`);
});

test('Fox cover evasion ensures rails in vegetation are invisible and immune from chase', () => {
    const foxContent = fs.readFileSync('src/entities/predators/Fox.js', 'utf-8');

    assert.match(
        foxContent,
        /if\s*\(\s*!rail\.isAlive\s*\|\|\s*!rail\.isDetectable\s*\)\s*return\s*false/,
        'Fox searchForPrey must ignore rails that are undetectable (in cover)'
    );

    assert.match(
        foxContent,
        /if\s*\(\s*!this\.target\s*\|\|\s*!this\.target\.isAlive\s*\|\|\s*!this\.target\.isDetectable\s*\)\s*\{\s*this\.endChase\(\);/,
        'Fox chase must immediately abort if target enters cover'
    );
});

test('A rail stays fixed while the fox pounce animation approaches contact', () => {
    const railContent = fs.readFileSync('src/entities/Rail.js', 'utf-8');

    assert.match(
        railContent,
        /if\s*\(this\.isBeingCaught\)\s*\{\s*this\.body\.setVelocity\(0,\s*0\);\s*return;/,
        'Rail update must not resume autonomous movement during the pounce wind-up'
    );
});

test('LevelManager and GameScene integrate Gray Fox predator into gameplay', () => {
    const levelContent = fs.readFileSync('src/systems/LevelManager.js', 'utf-8');
    assert.match(levelContent, /foxCount:\s*1/, 'Level 1 config must include foxCount: 1');

    const gameContent = fs.readFileSync('src/scenes/GameScene.js', 'utf-8');
    assert.match(gameContent, /import\s*\{\s*Fox\s*\}\s*from\s*['"]\.\.\/entities\/predators\/Fox\.js['"]/, 'GameScene imports Fox');
    assert.match(gameContent, /new Fox\(this,\s*startX,\s*startY\)/, 'GameScene instantiates Fox in spawnPredators');
    assert.match(gameContent, /this\.groundPredators\.add\(fox\)/, 'GameScene adds fox to groundPredators group');
});

test('Fox diagonal patrol trajectory bounces and reverses vertical and horizontal heading', () => {
    let currentX = 300;
    let currentY = 200;
    let patrolDirX = 1;
    let patrolDirY = 1;
    const patrolSpeed = 115;
    const headingAngle = 0.65;
    const minY = 100;
    const maxY = 500;
    const safeWaterX = 95;
    const maxMarshX = 900;

    const step = (deltaSec) => {
        let vx = patrolDirX * Math.cos(headingAngle) * patrolSpeed;
        let vy = patrolDirY * Math.sin(headingAngle) * patrolSpeed;
        currentX += vx * deltaSec;
        currentY += vy * deltaSec;

        if (currentY <= minY && patrolDirY < 0) {
            currentY = minY;
            patrolDirY = 1;
        } else if (currentY >= maxY && patrolDirY > 0) {
            currentY = maxY;
            patrolDirY = -1;
        }

        if (currentX <= safeWaterX && patrolDirX < 0) {
            currentX = safeWaterX;
            patrolDirX = 1;
        } else if (currentX >= maxMarshX && patrolDirX > 0) {
            currentX = maxMarshX;
            patrolDirX = -1;
        }
    };

    // Simulate 20 seconds of diagonal trotting
    const yHistory = [];
    const xHistory = [];
    for (let t = 0; t < 200; t++) {
        step(0.1);
        yHistory.push(currentY);
        xHistory.push(currentX);
        assert.ok(currentY >= minY && currentY <= maxY, `Y coordinate ${currentY} within [${minY}..${maxY}]`);
        assert.ok(currentX >= safeWaterX && currentX <= maxMarshX, `X coordinate ${currentX} within [${safeWaterX}..${maxMarshX}]`);
    }

    // Must have reached both near top and near bottom
    assert.ok(Math.min(...yHistory) <= minY + 20, 'Fox reached upper marsh region');
    assert.ok(Math.max(...yHistory) >= maxY - 20, 'Fox reached lower marsh region');
    assert.ok(Math.max(...xHistory) - Math.min(...xHistory) > 300, 'Fox spanned horizontal width');
});
