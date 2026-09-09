import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const PLANT_STAGE_BOUNDS = {
    gumplant: [
        { x: 172, y: 291, w: 141, h: 109 },
        { x: 517, y: 238, w: 203, h: 162 },
        { x: 876, y: 180, w: 262, h: 222 },
        { x: 1280, y: 110, w: 366, h: 292 },
        { x: 24, y: 513, w: 374, h: 311 },
        { x: 413, y: 503, w: 376, h: 326 },
        { x: 801, y: 469, w: 418, h: 362 },
        { x: 1240, y: 456, w: 522, h: 376 },
    ],
    cordgrass: [
        { x: 147, y: 233, w: 114, h: 149 },
        { x: 497, y: 159, w: 236, h: 224 },
        { x: 906, y: 78, w: 325, h: 305 },
        { x: 1346, y: 19, w: 376, h: 364 },
        { x: 30, y: 454, w: 368, h: 385 },
        { x: 434, y: 430, w: 401, h: 409 },
        { x: 838, y: 420, w: 445, h: 419 },
        { x: 1287, y: 420, w: 475, h: 423 },
    ],
    pickleweed: [
        { x: 166, y: 192, w: 121, h: 176 },
        { x: 551, y: 118, w: 187, h: 265 },
        { x: 886, y: 72, w: 330, h: 325 },
        { x: 1322, y: 17, w: 407, h: 392 },
        { x: 32, y: 482, w: 373, h: 348 },
        { x: 448, y: 476, w: 378, h: 358 },
        { x: 848, y: 473, w: 417, h: 375 },
        { x: 1289, y: 433, w: 468, h: 420 },
    ],
    saltgrass: [
        { x: 154, y: 229, w: 114, h: 154 },
        { x: 477, y: 198, w: 204, h: 186 },
        { x: 832, y: 88, w: 286, h: 296 },
        { x: 1259, y: 28, w: 370, h: 356 },
        { x: 44, y: 511, w: 338, h: 316 },
        { x: 395, y: 443, w: 398, h: 386 },
        { x: 800, y: 427, w: 427, h: 404 },
        { x: 1240, y: 420, w: 516, h: 415 },
    ],
    jaumea: [
        { x: 134, y: 202, w: 164, h: 151 },
        { x: 514, y: 123, w: 230, h: 240 },
        { x: 904, y: 79, w: 274, h: 287 },
        { x: 1361, y: 50, w: 332, h: 319 },
        { x: 25, y: 495, w: 344, h: 324 },
        { x: 400, y: 478, w: 407, h: 345 },
        { x: 813, y: 450, w: 412, h: 376 },
        { x: 1240, y: 436, w: 515, h: 404 },
    ],
};

const SHEET_WIDTH = 1774;
const SHEET_HEIGHT = 887;

test('all plant species have exactly 8 stages', () => {
    const keys = Object.keys(PLANT_STAGE_BOUNDS);
    assert.equal(keys.length, 5);
    for (const key of keys) {
        assert.equal(PLANT_STAGE_BOUNDS[key].length, 8);
    }
});

test('stage bounding boxes stay within sprite sheet dimensions', () => {
    for (const [key, stages] of Object.entries(PLANT_STAGE_BOUNDS)) {
        for (let i = 0; i < stages.length; i++) {
            const b = stages[i];
            assert.ok(b.x >= 0, `${key} stage ${i + 1} x >= 0`);
            assert.ok(b.y >= 0, `${key} stage ${i + 1} y >= 0`);
            assert.ok(b.w > 0, `${key} stage ${i + 1} w > 0`);
            assert.ok(b.h > 0, `${key} stage ${i + 1} h > 0`);
            assert.ok(b.x + b.w <= SHEET_WIDTH, `${key} stage ${i + 1} fits width (${b.x + b.w} <= ${SHEET_WIDTH})`);
            assert.ok(b.y + b.h <= SHEET_HEIGHT, `${key} stage ${i + 1} fits height (${b.y + b.h} <= ${SHEET_HEIGHT})`);
        }
    }
});

test('sprite sheet image files exist on disk', () => {
    for (const key of Object.keys(PLANT_STAGE_BOUNDS)) {
        const path = `public/assets/sprites/${key}_sprite_sheet.png`;
        assert.ok(fs.existsSync(path), `File ${path} exists`);
    }
});
