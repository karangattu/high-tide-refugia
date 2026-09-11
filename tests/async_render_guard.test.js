import test from 'node:test';
import assert from 'node:assert/strict';

const guardModule = await import('../src/ui/asyncRenderGuard.js').catch(() => null);

test('leaderboard ignores a response from the layout that existed before rotation', () => {
    assert.ok(guardModule?.nextRenderGeneration, 'render generation helper must be implemented');
    assert.ok(guardModule?.canApplyAsyncRender, 'async render guard must be implemented');

    const portraitGeneration = 3;
    const landscapeGeneration = guardModule.nextRenderGeneration(portraitGeneration);

    assert.equal(landscapeGeneration, 4);
    assert.equal(guardModule.canApplyAsyncRender(portraitGeneration, landscapeGeneration, true), false);
    assert.equal(guardModule.canApplyAsyncRender(landscapeGeneration, landscapeGeneration, false), false);
    assert.equal(guardModule.canApplyAsyncRender(landscapeGeneration, landscapeGeneration, true), true);
});
