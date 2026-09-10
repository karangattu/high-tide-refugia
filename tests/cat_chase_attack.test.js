import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const catContent = fs.readFileSync('src/entities/predators/Cat.js', 'utf-8');

test('Cat resets chase tracking timer and distance in startChase override', () => {
    const catStartChaseMatch = catContent.match(/class Cat extends GroundPredator[\s\S]*?startChase\s*\([^)]*\)\s*\{([\s\S]*?)\n    \}/);
    assert.ok(catStartChaseMatch, 'Cat must define startChase');
    const body = catStartChaseMatch[1];
    assert.match(body, /this\.chaseStuckTimer\s*=\s*0;/, 'Cat.startChase must reset chaseStuckTimer');
    assert.match(body, /this\.lastChaseDistance\s*=\s*Infinity;/, 'Cat.startChase must reset lastChaseDistance');
    assert.match(body, /this\.setFlipX\(/, 'Cat.startChase must orient toward target');
});

test('Cat constructor configures responsive vision, scent sensing, and steer rate', () => {
    assert.match(catContent, /this\.visionRange\s*=\s*185;/, 'Cat visionRange must be at least 185');
    assert.match(catContent, /this\.senseRadius\s*=\s*90;/, 'Cat senseRadius must be configured for close-range detection');
    assert.match(catContent, /this\.steerRate\s*=\s*16;/, 'Cat steerRate must be responsive');
});

test('GroundPredator canSeeRail detects prey within senseRadius regardless of facing', () => {
    assert.match(
        catContent,
        /if\s*\(\s*this\.senseRadius\s*&&\s*distance\s*<=\s*this\.senseRadius\s*\)\s*return\s*true;/,
        'canSeeRail must allow detection within senseRadius'
    );
});

test('Cat stuck abort only triggers when clamped against marsh or water boundary', () => {
    assert.match(
        catContent,
        /const isClamped\s*=\s*\(this\.x\s*<=\s*safeWaterX\s*\+\s*4\)\s*\|\|\s*\(this\.y\s*<=\s*minY\s*\+\s*4\)\s*\|\|\s*\(this\.y\s*>=\s*maxY\s*-\s*4\);/,
        'Stuck timer must only accumulate when clamped at a boundary'
    );
});
