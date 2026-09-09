import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WaterSystem } from '../src/systems/WaterSystem.js';

test('getWaveOffset returns non-zero wave offsets with multi-frequency curve', () => {
    const ws = new WaterSystem({ scale: { height: 600 }, add: { graphics: () => ({ setDepth: () => ({}) }), particles: () => ({ setDepth: () => ({}) }) } }, 50, 100, 500);
    const offset1 = ws.getWaveOffset(150, 500);
    const offset2 = ws.getWaveOffset(350, 500);
    assert.equal(typeof offset1, 'number');
    assert.equal(typeof offset2, 'number');
    assert.notEqual(offset1, offset2);
});

test('getWaterX varies across different Y values along the wave curve', () => {
    const ws = new WaterSystem({ scale: { height: 600 }, add: { graphics: () => ({ setDepth: () => ({}) }), particles: () => ({ setDepth: () => ({}) }) } }, 100, 100, 500);
    ws.currentX = 120;
    ws.elapsed = 1000;
    const xTop = ws.getWaterX(150);
    const xMid = ws.getWaterX(300);
    const xBottom = ws.getWaterX(450);
    assert.ok(xTop > 0);
    assert.ok(xMid > 0);
    assert.ok(xBottom > 0);
    assert.ok(xTop !== xMid || xMid !== xBottom);
});

test('water advance increases currentX over time in update', () => {
    const ws = new WaterSystem({ scale: { height: 600 }, add: { graphics: () => ({ setDepth: () => ({ clear: () => {}, fillStyle: () => {}, fillGradientStyle: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {}, fillPath: () => {}, lineStyle: () => {}, strokePath: () => {}, fillCircle: () => {} }) }), particles: () => ({ setDepth: () => ({ setPosition: () => {} }), setPosition: () => {} }) } }, 50, 100, 500);
    const initialX = ws.currentX;
    ws.update(1000);
    assert.ok(ws.currentX > initialX);
});

test('reset restores initial water state', () => {
    const ws = new WaterSystem({ scale: { height: 600 }, add: { graphics: () => ({ setDepth: () => ({ clear: () => {}, fillStyle: () => {}, fillGradientStyle: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {}, fillPath: () => {}, lineStyle: () => {}, strokePath: () => {}, fillCircle: () => {} }) }), particles: () => ({ setDepth: () => ({ setPosition: () => {} }), setPosition: () => {} }) } }, 50, 100, 500);
    ws.update(2000);
    assert.ok(ws.currentX > 50);
    ws.reset();
    assert.equal(ws.currentX, 50);
    assert.equal(ws.elapsed, 0);
});
