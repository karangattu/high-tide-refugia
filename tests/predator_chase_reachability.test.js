import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const catContent = fs.readFileSync('src/entities/predators/Cat.js', 'utf-8');
const foxContent = fs.readFileSync('src/entities/predators/Fox.js', 'utf-8');

// Clamp margins used in each predator's update(). A rail parked in the lane
// against these bounds must still be within catch distance.
const CAT_BOTTOM_MARGIN = 20;
const FOX_MARGIN = 15;
const MOBILE_ENTITY_SCALE = 0.65;

test('ground predators floor catch distance above their marsh clamp margins', () => {
    const catFloor = Number(catContent.match(/this\.catchDistance\s*=\s*Math\.max\((\d+)/)?.[1]);
    const foxFloor = Number(foxContent.match(/this\.catchDistance\s*=\s*Math\.max\((\d+)/)?.[1]);

    assert.ok(catFloor > CAT_BOTTOM_MARGIN, `cat catch floor ${catFloor} must exceed bottom clamp ${CAT_BOTTOM_MARGIN}`);
    assert.ok(foxFloor > FOX_MARGIN, `fox catch floor ${foxFloor} must exceed clamp margin ${FOX_MARGIN}`);

    // The same floor must hold at the smallest mobile entity scale (0.65),
    // where the previous uncapped values (30/32 * 0.65) fell below the margin.
    const catMobile = Math.max(catFloor, 30 * MOBILE_ENTITY_SCALE);
    const foxMobile = Math.max(foxFloor, 32 * MOBILE_ENTITY_SCALE);
    assert.ok(catMobile > CAT_BOTTOM_MARGIN, 'mobile cat must still reach the bottom lane');
    assert.ok(foxMobile > FOX_MARGIN, 'mobile fox must still reach the clamp lanes');
});

test('ground predators never lock onto rails inside the water exclusion band', () => {
    for (const [name, content] of [['Cat', catContent], ['Fox', foxContent]]) {
        assert.match(
            content,
            /if\s*\(\s*rail\.x\s*<\s*safeWaterX\s*\)\s*return\s*false;/,
            `${name} searchForPrey must ignore rails inside the unreachable water band`
        );
    }
});

test('chase aborts when a predator is clamped and no longer closing in', () => {
    for (const [name, content] of [['Cat', catContent], ['Fox', foxContent]]) {
        assert.match(content, /this\.chaseStuckTimer\s*\+=\s*delta/, `${name} must accumulate a stuck timer`);
        assert.match(
            content,
            /if\s*\(\s*this\.chaseStuckTimer\s*>\s*\d+\s*\)\s*\{\s*this\.endChase\(\);/,
            `${name} must give up after being stuck`
        );
        assert.match(content, /this\.lastChaseDistance\s*=\s*Infinity/, `${name} must reset chase tracking`);
    }
});

test('chase uses smooth steering instead of snapping velocity', () => {
    for (const [name, content] of [['Cat', catContent], ['Fox', foxContent]]) {
        assert.match(content, /steer\(desiredVX,\s*desiredVY,\s*delta\)\s*\{/, `${name} must define a steer helper`);
        assert.match(content, /this\.steer\(\s*Math\.cos\(angle\)/, `${name} chase must steer toward its target`);
        assert.doesNotMatch(
            content,
            /this\.body\.setVelocity\(\s*Math\.cos\(angle\)/,
            `${name} chase must not snap velocity directly`
        );
    }
});
