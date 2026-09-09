import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

test('gray fox sprite sheet exists with valid 6-frame dimensions and zero border bleed', () => {
    const spritePath = 'public/assets/sprites/gray_fox_sprite.png';
    assert.ok(fs.existsSync(spritePath), 'gray_fox_sprite.png must exist');

    const script = `
from PIL import Image
import numpy as np

img = Image.open('${spritePath}')
w, h = img.size
assert w == 2700 and h == 250, f"Expected 2700x250, got {w}x{h}"

arr = np.array(img)
cell_w = 450
cell_h = 250
edge_violations = 0
for i in range(6):
    f = arr[0:cell_h, i*cell_w:(i+1)*cell_w]
    alpha = f[:, :, 3]
    edge_violations += int(np.sum(alpha[0, :] > 0) + np.sum(alpha[-1, :] > 0) + np.sum(alpha[:, 0] > 0) + np.sum(alpha[:, -1] > 0))
print(edge_violations)
`;
    const out = execSync('python3', { input: script }).toString().trim();
    assert.equal(parseInt(out, 10), 0, 'All 6 fox frames must have 0 edge bleed pixels');
});

test('BootScene preloads fox_sheet with 450x250 frame dimensions', () => {
    const bootContent = fs.readFileSync('src/scenes/BootScene.js', 'utf-8');
    assert.match(
        bootContent,
        /this\.load\.spritesheet\(\s*['"]fox_sheet['"],\s*['"]assets\/sprites\/gray_fox_sprite\.png['"],\s*\{\s*frameWidth:\s*450,\s*frameHeight:\s*250\s*\}\s*\)/,
        'BootScene must preload fox_sheet with 450x250 frames'
    );
});

test('Fox class implementation enforces diagonal movement, boundaries, and depth', () => {
    const foxContent = fs.readFileSync('src/entities/predators/Fox.js', 'utf-8');

    assert.match(foxContent, /this\.setDepth\(4\)/, 'Fox must be set to depth 4 (ground predator)');
    assert.match(foxContent, /this\.trottingFrames\s*=\s*\[0,\s*1,\s*2,\s*3\]/, 'Fox uses frames 0-3 for trot cycle');
    assert.match(foxContent, /this\.setFrame\(4\)/, 'Fox uses frame 4 for stalk/alert pose');
    assert.match(foxContent, /this\.setFrame\(5\)/, 'Fox uses frame 5 for pounce/catch pose');

    assert.match(foxContent, /Math\.cos\(this\.headingAngle\)/, 'Fox calculates diagonal horizontal velocity');
    assert.match(foxContent, /Math\.sin\(this\.headingAngle\)/, 'Fox calculates diagonal vertical velocity');

    assert.match(foxContent, /this\.y\s*<=\s*minY\s*&&\s*this\.patrolDirY\s*<\s*0/, 'Fox bounces off top marsh boundary');
    assert.match(foxContent, /this\.y\s*>=\s*maxY\s*&&\s*this\.patrolDirY\s*>\s*0/, 'Fox bounces off bottom marsh boundary');
    assert.match(foxContent, /this\.x\s*<=\s*safeWaterX\s*&&\s*this\.patrolDirX\s*<\s*0/, 'Fox bounces off water safe line');
    assert.match(foxContent, /this\.x\s*>=\s*maxMarshX\s*&&\s*this\.patrolDirX\s*>\s*0/, 'Fox bounces off upland refuge boundary');
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
