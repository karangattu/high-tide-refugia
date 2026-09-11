import test from 'node:test';
import assert from 'node:assert/strict';

const layoutModule = await import('../src/ui/nameEntryLayout.js').catch(() => null);

test('focused name entry stays at the top when Android does not report keyboard resize', () => {
    assert.ok(layoutModule?.getNameEntryLayout, 'name entry layout helper must be implemented');

    const layout = layoutModule.getNameEntryLayout({
        focused: true,
        visualViewport: { width: 1280, height: 800, offsetLeft: 0, offsetTop: 0 },
        windowViewport: { width: 1280, height: 800 },
        canvasRect: { left: 0, top: 0, width: 1280, height: 800 },
        gameSize: { width: 1280, height: 800 },
        anchor: { x: 1050, y: 720 },
        inlineWidth: 238,
        rowHeight: 44,
    });

    assert.deepEqual(layout, {
        mode: 'typing',
        left: 380,
        top: 12,
        width: 520,
    });
});

test('focused name entry follows the top of a resized visual viewport', () => {
    assert.ok(layoutModule?.getNameEntryLayout, 'name entry layout helper must be implemented');

    const layout = layoutModule.getNameEntryLayout({
        focused: true,
        visualViewport: { width: 1024, height: 390, offsetLeft: 0, offsetTop: 18 },
        windowViewport: { width: 1024, height: 768 },
        canvasRect: { left: 0, top: 0, width: 1024, height: 768 },
        gameSize: { width: 1024, height: 768 },
        anchor: { x: 820, y: 690 },
        inlineWidth: 238,
        rowHeight: 44,
    });

    assert.equal(layout.mode, 'typing');
    assert.equal(layout.top, 30);
    assert.equal(layout.left, 252);
    assert.equal(layout.width, 520);
});

test('unfocused name entry remains aligned to its Phaser leaderboard anchor', () => {
    assert.ok(layoutModule?.getNameEntryLayout, 'name entry layout helper must be implemented');

    const layout = layoutModule.getNameEntryLayout({
        focused: false,
        visualViewport: { width: 1280, height: 800, offsetLeft: 0, offsetTop: 0 },
        windowViewport: { width: 1280, height: 800 },
        canvasRect: { left: 40, top: 20, width: 960, height: 600 },
        gameSize: { width: 1280, height: 800 },
        anchor: { x: 1000, y: 700 },
        inlineWidth: 238,
        rowHeight: 44,
    });

    assert.deepEqual(layout, {
        mode: 'inline',
        left: 671,
        top: 523,
        width: 238,
    });
});
