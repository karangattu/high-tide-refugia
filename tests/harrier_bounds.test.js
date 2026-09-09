import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

export const HARRIER_FRAME_BOUNDS = {
    harrier_glide_1: { x: 10, y: 92, w: 277, h: 263 },
    harrier_glide_2: { x: 310, y: 168, w: 311, h: 191 },
    harrier_glide_3: { x: 639, y: 140, w: 267, h: 216 },
    harrier_glide_4: { x: 927, y: 241, w: 287, h: 118 },
    harrier_glide_5: { x: 1239, y: 124, w: 247, h: 237 },
    harrier_glide_6: { x: 1503, y: 88, w: 266, h: 271 },
    harrier_dive: { x: 501, y: 450, w: 288, h: 270 },
    harrier_catch: { x: 948, y: 500, w: 309, h: 345 },
    harrier_kill: { x: 1369, y: 406, w: 329, h: 413 },
};

const SHEET_WIDTH = 1774;
const SHEET_HEIGHT = 887;

test('harrier has all required flight, dive, catch and kill frames', () => {
    const keys = Object.keys(HARRIER_FRAME_BOUNDS);
    assert.equal(keys.length, 9);
    for (let i = 1; i <= 6; i++) {
        assert.ok(HARRIER_FRAME_BOUNDS[`harrier_glide_${i}`], `glide frame ${i} exists`);
    }
    assert.ok(HARRIER_FRAME_BOUNDS.harrier_dive, 'dive frame exists');
    assert.ok(HARRIER_FRAME_BOUNDS.harrier_catch, 'catch frame exists');
    assert.ok(HARRIER_FRAME_BOUNDS.harrier_kill, 'kill frame exists');
});

test('harrier frame bounds stay within sprite sheet dimensions', () => {
    for (const [key, b] of Object.entries(HARRIER_FRAME_BOUNDS)) {
        assert.ok(b.x >= 0, `${key} x >= 0`);
        assert.ok(b.y >= 0, `${key} y >= 0`);
        assert.ok(b.w > 0, `${key} w > 0`);
        assert.ok(b.h > 0, `${key} h > 0`);
        assert.ok(b.x + b.w <= SHEET_WIDTH, `${key} fits width (${b.x + b.w} <= ${SHEET_WIDTH})`);
        assert.ok(b.y + b.h <= SHEET_HEIGHT, `${key} fits height (${b.y + b.h} <= ${SHEET_HEIGHT})`);
    }
});

test('harrier sprite sheet image file exists on disk', () => {
    const path = 'public/assets/sprites/northern_harrier_sprite.png';
    assert.ok(fs.existsSync(path), `File ${path} exists`);
});

test('harrier_glide_2 captures unclipped wing (width >= 310)', () => {
    const frame2 = HARRIER_FRAME_BOUNDS.harrier_glide_2;
    assert.ok(frame2.w >= 310, `harrier_glide_2 width ${frame2.w} >= 310`);
    assert.ok(frame2.x + frame2.w >= 620, 'harrier_glide_2 reaches full right wing tip');
});

test('harrier_kill captures unclipped upper wing (starts at y <= 410)', () => {
    const killFrame = HARRIER_FRAME_BOUNDS.harrier_kill;
    assert.ok(killFrame.y <= 410, `harrier_kill y ${killFrame.y} captures upper wing`);
    assert.ok(killFrame.h >= 410, 'harrier_kill height captures full height');
});
