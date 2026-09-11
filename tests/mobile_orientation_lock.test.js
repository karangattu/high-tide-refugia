import test from 'node:test';
import assert from 'node:assert/strict';

const mobileModule = await import('../src/utils/mobile.js');

test('portrait Android tablets require landscape while landscape tablets do not', () => {
    assert.ok(mobileModule.shouldRequireLandscape, 'tablet landscape guard must be implemented');
    assert.equal(mobileModule.shouldRequireLandscape(800, 1280, true), true);
    assert.equal(mobileModule.shouldRequireLandscape(1280, 800, true), false);
});

test('portrait orientation lock does not target large desktops or non-touch windows', () => {
    assert.ok(mobileModule.shouldRequireLandscape, 'tablet landscape guard must be implemented');
    assert.equal(mobileModule.shouldRequireLandscape(800, 1280, false), false);
    assert.equal(mobileModule.shouldRequireLandscape(1200, 1600, true), false);
});
