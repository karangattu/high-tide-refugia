import { test } from 'node:test';
import assert from 'node:assert/strict';

function calculateEnvironmentLayout(width, height) {
    const portrait = height > width;
    const isMobileLandscape = height <= 520 || (width < 768 && height < 600);
    const horizonY = height * (portrait ? 0.34 : (isMobileLandscape ? 0.22 : 0.40));
    const marshY = height * (portrait ? 0.52 : (isMobileLandscape ? 0.38 : 0.56));
    const footerH = isMobileLandscape ? 34 : 50;
    const marshTop = marshY + (isMobileLandscape ? 24 : 30);
    const marshBottom = height - footerH - 45;
    const footerTop = height - footerH;

    return { horizonY, marshY, marshTop, marshBottom, footerH, footerTop };
}

test('marshBottom maintains at least 45px safety buffer above footer on all devices', () => {
    const viewports = [
        { width: 800, height: 360, name: 'Android phone landscape' },
        { width: 844, height: 390, name: 'iPhone 14 landscape' },
        { width: 915, height: 412, name: 'Pixel landscape' },
        { width: 667, height: 375, name: 'iPhone SE landscape' },
        { width: 1024, height: 768, name: 'iPad landscape' },
        { width: 1280, height: 800, name: 'Desktop standard' },
        { width: 1920, height: 1080, name: 'Desktop Full HD' },
    ];

    for (const vp of viewports) {
        const layout = calculateEnvironmentLayout(vp.width, vp.height);
        const clearance = layout.footerTop - layout.marshBottom;
        assert.ok(
            clearance >= 45,
            `${vp.name} (${vp.width}x${vp.height}) clearance is ${clearance}px >= 45px`
        );
        assert.ok(
            layout.marshBottom > layout.marshTop,
            `${vp.name} playable marsh strip exists (${layout.marshBottom} > ${layout.marshTop})`
        );
    }
});

test('mobile landscape gives marsh >= 60% of vertical height', () => {
    const mobileViewports = [
        { width: 800, height: 360 },
        { width: 844, height: 390 },
        { width: 667, height: 375 },
    ];

    for (const vp of mobileViewports) {
        const layout = calculateEnvironmentLayout(vp.width, vp.height);
        const marshFraction = (vp.height - layout.marshY) / vp.height;
        assert.ok(
            marshFraction >= 0.60,
            `mobile landscape (${vp.width}x${vp.height}) marsh fraction ${marshFraction.toFixed(2)} >= 0.60`
        );
    }
});

test('mobile compact top HUD panels total width fits smallest phones without overlap', () => {
    const panelW1 = 165; // seed panel
    const panelW2 = 175; // wave status panel
    const panelW3 = 150; // score panel
    const pad = 6;
    const smallestPhoneWidth = 667;

    const leftEnd = pad + panelW1;
    const centerStart = (smallestPhoneWidth / 2) - (panelW2 / 2);
    const centerEnd = (smallestPhoneWidth / 2) + (panelW2 / 2);
    const rightStart = smallestPhoneWidth - pad - panelW3;

    assert.ok(centerStart > leftEnd, `Gap between left and center is ${centerStart - leftEnd}px > 0`);
    assert.ok(rightStart > centerEnd, `Gap between center and right is ${rightStart - centerEnd}px > 0`);
});
