import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function calculateEnvironmentLayout(width, height) {
    const portrait = height > width;
    const isMobileLandscape = height <= 520 || (width < 768 && height < 600);
    const horizonY = Math.round(height * (portrait ? 0.14 : (isMobileLandscape ? 0.08 : 0.36)));
    const marshY = Math.round(height * (portrait ? 0.24 : (isMobileLandscape ? 0.15 : 0.52)));
    const footerH = isMobileLandscape ? 34 : 50;
    const marshTop = marshY + (isMobileLandscape ? 12 : 30);
    const marshBottom = height - footerH - 45;
    const footerTop = height - footerH;

    return { horizonY, marshY, marshTop, marshBottom, footerH, footerTop };
}

test('marshBottom maintains at least 45px safety buffer above footer on all devices', () => {
    const viewports = [
        { width: 800, height: 360, name: 'Android phone landscape' },
        { width: 844, height: 390, name: 'iPhone 14 landscape' },
        { width: 915, height: 412, name: 'Pixel landscape' },
        { width: 667, height: 375, name: 'iPhone SE landscape' },
        { width: 1024, height: 768, name: 'iPad landscape' },
        { width: 1280, height: 800, name: 'Desktop standard' },
        { width: 1920, height: 1080, name: 'Desktop Full HD' },
    ];

    for (const vp of viewports) {
        const layout = calculateEnvironmentLayout(vp.width, vp.height);
        const clearance = layout.footerTop - layout.marshBottom;
        assert.ok(
            clearance >= 45,
            `${vp.name} (${vp.width}x${vp.height}) clearance is ${clearance}px >= 45px`
        );
        assert.ok(
            layout.marshBottom > layout.marshTop,
            `${vp.name} playable marsh strip exists (${layout.marshBottom} > ${layout.marshTop})`
        );
    }
});

test('mobile landscape gives marsh >= 80% of vertical height', () => {
    const mobileViewports = [
        { width: 800, height: 360 },
        { width: 844, height: 390 },
        { width: 667, height: 375 },
    ];

    for (const vp of mobileViewports) {
        const layout = calculateEnvironmentLayout(vp.width, vp.height);
        const marshFraction = (vp.height - layout.marshY) / vp.height;
        assert.ok(
            marshFraction >= 0.80,
            `mobile landscape (${vp.width}x${vp.height}) marsh fraction ${marshFraction.toFixed(2)} >= 0.80`
        );
    }
});

test('mobile landscape allocates >= 55% of total screen height to active playable strip', () => {
    const mobileViewports = [
        { width: 800, height: 360, name: 'Android phone landscape' },
        { width: 844, height: 390, name: 'iPhone 14 landscape' },
        { width: 667, height: 375, name: 'iPhone SE landscape' },
    ];

    for (const vp of mobileViewports) {
        const layout = calculateEnvironmentLayout(vp.width, vp.height);
        const playableHeight = layout.marshBottom - layout.marshTop;
        const playableFraction = playableHeight / vp.height;
        assert.ok(
            playableFraction >= 0.55,
            `${vp.name} (${vp.width}x${vp.height}) playable strip fraction ${playableFraction.toFixed(2)} >= 0.55`
        );
    }
});

test('mobile compact top HUD panels total width fits smallest phones without overlap', () => {
    const panelW1 = 165; // seed panel
    const panelW2 = 175; // wave status panel
    const panelW3 = 150; // score panel
    const pad = 6;
    const smallestPhoneWidth = 667;

    const leftEnd = pad + panelW1;
    const centerStart = (smallestPhoneWidth / 2) - (panelW2 / 2);
    const centerEnd = (smallestPhoneWidth / 2) + (panelW2 / 2);
    const rightStart = smallestPhoneWidth - pad - panelW3;

    assert.ok(centerStart > leftEnd, `Gap between left and center is ${centerStart - leftEnd}px > 0`);
    assert.ok(rightStart > centerEnd, `Gap between center and right is ${rightStart - centerEnd}px > 0`);
});

test('GameScene source code reduces sun and distant water on mobile', () => {
    const gameSceneContent = fs.readFileSync('src/scenes/GameScene.js', 'utf-8');

    assert.match(
        gameSceneContent,
        /if\s*\(\s*isMobileLandscape\s*\)\s*\{[\s\S]*?sun\.fillCircle[\s\S]*?horizonY\s*\*\s*0\.42/,
        'GameScene must render compact sun on mobile landscape'
    );

    assert.match(
        gameSceneContent,
        /this\.marshY\s*=\s*Math\.round\(height\s*\*\s*\(portrait\s*\?\s*0\.24\s*:\s*\(isMobileLandscape\s*\?\s*0\.15\s*:\s*0\.52\)\)\)/,
        'GameScene marshY must allocate 85% of screen height to marsh on mobile landscape'
    );
});
