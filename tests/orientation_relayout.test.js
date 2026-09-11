import test from 'node:test';
import assert from 'node:assert/strict';

const viewportModule = await import('../src/utils/viewportResize.js').catch(() => null);
const layoutModule = await import('../src/ui/orientationLayout.js').catch(() => null);

test('orientation refresh retries until Android viewport dimensions settle', () => {
    assert.ok(viewportModule?.scheduleOrientationRefresh, 'orientation refresh scheduler must be implemented');

    const jobs = [];
    const refreshes = [];
    let settled = 0;
    viewportModule.scheduleOrientationRefresh(
        info => refreshes.push(info),
        () => { settled++; },
        (callback, delay) => {
            jobs.push({ callback, delay });
            return delay;
        }
    );

    assert.ok(jobs.length >= 3, 'rotation needs more than one delayed viewport measurement');
    assert.equal(jobs[0].delay, 0);
    assert.ok(jobs.at(-1).delay >= 600, 'the last measurement must run after Android rotation settles');

    jobs.forEach(job => job.callback());
    assert.equal(refreshes.length, jobs.length);
    assert.equal(refreshes.at(-1).isFinal, true);
    assert.equal(settled, 1);
});

test('physical screen orientation wins over keyboard-shortened viewport dimensions', () => {
    assert.ok(layoutModule?.getOrientationAxis, 'orientation helper must be implemented');

    assert.equal(
        layoutModule.getOrientationAxis('portrait-primary', 800, 420),
        'portrait',
        'an open keyboard must not masquerade as landscape'
    );
    assert.equal(layoutModule.getOrientationAxis('landscape-primary', 1280, 800), 'landscape');
});

test('game over layout changes from portrait stack to full landscape columns after rotation', () => {
    assert.ok(layoutModule?.getGameOverLayoutMode, 'game over layout helper must be implemented');

    assert.equal(layoutModule.getGameOverLayoutMode(800, 1280), 'portrait');
    assert.equal(layoutModule.getGameOverLayoutMode(1280, 800), 'landscape');
});
