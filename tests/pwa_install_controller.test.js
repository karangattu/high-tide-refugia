import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    PwaInstallController,
    isAndroidDevice,
    shouldShowInstallOption,
} from '../src/utils/pwaInstall.js';

function createWindow() {
    const listeners = new Map();
    return {
        listeners,
        matchMedia: () => ({ matches: false }),
        addEventListener: (name, listener) => listeners.set(name, listener),
    };
}

test('Android phones and tablets are offered an in-game install option', () => {
    const androidPhone = { userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9)' };
    const androidTablet = { userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X910)' };

    assert.equal(isAndroidDevice(androidPhone), true);
    assert.equal(isAndroidDevice(androidTablet), true);
    assert.equal(shouldShowInstallOption(createWindow(), androidPhone), true);
    assert.equal(shouldShowInstallOption(createWindow(), androidTablet), true);
});

test('installed standalone apps do not show the install option', () => {
    const browserWindow = createWindow();
    browserWindow.matchMedia = query => ({ matches: query === '(display-mode: standalone)' });
    const android = { userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9)' };

    assert.equal(shouldShowInstallOption(browserWindow, android), false);
});

test('controller captures and opens the native Android install prompt', async () => {
    const browserWindow = createWindow();
    const controller = new PwaInstallController(browserWindow);
    let prevented = false;
    let prompted = false;
    const promptEvent = {
        preventDefault: () => { prevented = true; },
        prompt: async () => { prompted = true; },
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    };

    controller.start();
    browserWindow.listeners.get('beforeinstallprompt')(promptEvent);
    assert.equal(prevented, true);
    assert.equal(controller.canPrompt(), true);

    const result = await controller.requestInstall();
    assert.equal(prompted, true);
    assert.deepEqual(result, { status: 'accepted' });
    assert.equal(controller.canPrompt(), false);
});

test('controller reports unavailable so the game can show manual Android steps', async () => {
    const controller = new PwaInstallController(createWindow());
    assert.deepEqual(await controller.requestInstall(), { status: 'unavailable' });
});
