import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const catContent = fs.readFileSync('src/entities/predators/Cat.js', 'utf-8');

test('Cat source code implements vertical boundary clamping and lane return', () => {
    assert.match(catContent, /marshTop/);
    assert.match(catContent, /marshBottom/);
    assert.match(catContent, /minY\s*=\s*marshTop\s*\+\s*15/);
    assert.match(catContent, /maxY\s*=\s*marshBottom\s*-\s*20/);
    assert.match(catContent, /this\.homeY/);
    assert.match(catContent, /distY\s*=\s*this\.homeY\s*-\s*this\.y/);
});

test('Cat source code implements water flee and dynamic patrol corridor advancement', () => {
    assert.match(catContent, /getWaterXAtCat\s*\(\)/);
    assert.match(catContent, /safeWaterX\s*=\s*waterX\s*\+\s*45/);
    assert.match(catContent, /currentPatrolMinX\s*=\s*Math\.max\(this\.initialPatrolMinX,\s*safeWaterX\)/);
    assert.match(catContent, /currentPatrolMaxX\s*=\s*Math\.max/);
    assert.match(catContent, /currentPatrolMinX\s*\+\s*this\.patrolSpan/);
});

test('Cat patrol corridor guarantees positive span as water level advances', () => {
    const initialPatrolMinX = 250;
    const initialPatrolMaxX = 450;
    const patrolSpan = initialPatrolMaxX - initialPatrolMinX;
    const maxMarshX = 1100;

    for (let waterX = 0; waterX <= 1200; waterX += 50) {
        const safeWaterX = waterX + 45;
        const currentPatrolMinX = Math.max(initialPatrolMinX, safeWaterX);
        const currentPatrolMaxX = Math.max(
            initialPatrolMaxX,
            Math.min(maxMarshX, currentPatrolMinX + patrolSpan)
        );

        if (currentPatrolMinX < maxMarshX) {
            assert.ok(
                currentPatrolMaxX >= currentPatrolMinX,
                `Patrol corridor must not invert: min=${currentPatrolMinX}, max=${currentPatrolMaxX} at waterX=${waterX}`
            );
        }
    }
});

test('Cat endChase and cooldown force retreat away from water', () => {
    assert.match(catContent, /if\s*\(\s*this\.x\s*<\s*waterX\s*\+\s*65\s*\)\s*\{[\s\S]*?this\.setFlipX\(false\)[\s\S]*?this\.body\.setVelocityX\(this\.patrolSpeed\)/);
    assert.match(catContent, /if\s*\(\s*this\.x\s*<\s*waterX\s*\+\s*45\s*\)\s*\{[\s\S]*?this\.endChase\(\)/);
});
