import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('GameScene entity depth hierarchy ensures rail is in front of plants and behind aerial predators', () => {
    const plantContent = fs.readFileSync('src/entities/Plant.js', 'utf-8');
    const railContent = fs.readFileSync('src/entities/Rail.js', 'utf-8');
    const catContent = fs.readFileSync('src/entities/predators/Cat.js', 'utf-8');
    const harrierContent = fs.readFileSync('src/entities/predators/Harrier.js', 'utf-8');
    const waterContent = fs.readFileSync('src/systems/WaterSystem.js', 'utf-8');

    const plantDepthMatch = plantContent.match(/this\.setDepth\((\d+)\)/);
    const railDepthMatch = railContent.match(/this\.setDepth\((\d+)\)/);
    const catDepthMatch = catContent.match(/this\.setDepth\((\d+)\)/);
    const harrierDepthMatch = harrierContent.match(/this\.setDepth\((\d+)\)/);
    const waterDepthMatch = waterContent.match(/this\.waterGraphics\s*=\s*scene\.add\.graphics\(\)\.setDepth\((\d+)\)/);

    assert.ok(plantDepthMatch, 'Plant must set depth');
    assert.ok(railDepthMatch, 'Rail must set depth');
    assert.ok(catDepthMatch, 'Cat must set depth');
    assert.ok(harrierDepthMatch, 'Harrier must set depth');
    assert.ok(waterDepthMatch, 'WaterSystem must set waterGraphics depth');

    const plantDepth = Number(plantDepthMatch[1]);
    const railDepth = Number(railDepthMatch[1]);
    const catDepth = Number(catDepthMatch[1]);
    const harrierDepth = Number(harrierDepthMatch[1]);
    const waterDepth = Number(waterDepthMatch[1]);

    assert.ok(railDepth > plantDepth, `Rail depth (${railDepth}) must be in front of Plant depth (${plantDepth})`);
    assert.ok(catDepth >= railDepth, `Cat depth (${catDepth}) must be on or in front of Rail depth (${railDepth})`);
    assert.ok(waterDepth > railDepth, `Water depth (${waterDepth}) must submerge Rail depth (${railDepth})`);
    assert.ok(harrierDepth > waterDepth, `Harrier depth (${harrierDepth}) must fly above Water depth (${waterDepth})`);
});

test('MenuScene no longer draws decorative runner rails over the opening screen', () => {
    const menuContent = fs.readFileSync('src/scenes/MenuScene.js', 'utf-8');

    assert.doesNotMatch(menuContent, /startRailRunner\s*\(/, 'MenuScene must not start a decorative rail runner');
    assert.doesNotMatch(menuContent, /makeRunner\s*\(/, 'MenuScene must not build runner rail sprites');
    assert.doesNotMatch(menuContent, /rail_running_/, 'MenuScene must not animate running rail frames');
});

test('Rail dimensions remain smaller than ground and aerial predators across states', () => {
    const railContent = fs.readFileSync('src/entities/Rail.js', 'utf-8');
    const catContent = fs.readFileSync('src/entities/predators/Cat.js', 'utf-8');
    const harrierContent = fs.readFileSync('src/entities/predators/Harrier.js', 'utf-8');

    const railBaseScale = Number(railContent.match(/RAIL_BASE_SCALE\s*=\s*([0-9.]+)/)[1]);
    const catBaseScale = Number(catContent.match(/CAT_BASE_SCALE\s*=\s*([0-9.]+)/)[1]);
    const harrierBaseScale = Number(harrierContent.match(/HARRIER_BASE_SCALE\s*=\s*([0-9.]+)/)[1]);

    const RAIL_CANVAS_W = 864;
    const RAIL_CANVAS_H = 624;
    const CAT_FRAME_W = 500;
    const CAT_FRAME_H = 507;
    const HARRIER_AVG_W = 300;

    const railW = RAIL_CANVAS_W * railBaseScale;
    const railH = RAIL_CANVAS_H * railBaseScale;
    const railArea = railW * railH;

    const catW = CAT_FRAME_W * catBaseScale;
    const catH = CAT_FRAME_H * catBaseScale;
    const catArea = catW * catH;

    const harrierCruiseW = HARRIER_AVG_W * (harrierBaseScale * 0.82);
    const harrierDiveW = HARRIER_AVG_W * (harrierBaseScale * 1.45);

    assert.ok(railW < catW, `Rail width (${railW}px) must be smaller than Cat width (${catW}px)`);
    assert.ok(railH < catH, `Rail height (${railH}px) must be smaller than Cat height (${catH}px)`);
    assert.ok(railArea < catArea * 0.6, `Rail footprint area (${railArea.toFixed(0)}) must be much smaller than Cat area (${catArea.toFixed(0)})`);

    assert.ok(railW < harrierCruiseW, `Rail width (${railW}px) must be smaller than Harrier cruise wingspan (${harrierCruiseW.toFixed(1)}px)`);
    assert.ok(railW * 2 < harrierDiveW, `Harrier dive wingspan (${harrierDiveW.toFixed(1)}px) must be more than double Rail width (${railW}px)`);
});
