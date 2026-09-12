function getNavigator(fallback) {
    if (fallback) return fallback;
    return globalThis.navigator || {};
}

function getWindow(fallback) {
    if (fallback) return fallback;
    return typeof window !== 'undefined' ? window : null;
}

export function isAndroidDevice(navigatorObject) {
    const nav = getNavigator(navigatorObject);
    return /Android/i.test(nav.userAgent || '');
}

export function isStandaloneApp(windowObject, navigatorObject) {
    const browserWindow = getWindow(windowObject);
    const nav = getNavigator(navigatorObject);
    return Boolean(
        nav.standalone
        || browserWindow?.matchMedia?.('(display-mode: standalone)').matches
        || browserWindow?.matchMedia?.('(display-mode: fullscreen)').matches
    );
}

export function shouldShowInstallOption(windowObject, navigatorObject) {
    return isAndroidDevice(navigatorObject)
        && !isStandaloneApp(windowObject, navigatorObject);
}

export function getManualInstallContent(navigatorObject) {
    if (isAndroidDevice(navigatorObject)) {
        return {
            title: 'INSTALL ON ANDROID',
            steps: [
                'Open this site directly in Chrome. If you tapped a link inside another app, tap the three-dot menu and choose “Open in Chrome.”',
                'Tap the three-dot menu, then “Add to Home screen” and choose “Install app.”',
                'Don’t see it? Update Chrome from the Play Store, turn off “Desktop site,” then try again.',
            ],
        };
    }

    return {
        title: 'INSTALL THE GAME',
        steps: [
            'Open this page in your device browser.',
            'Open the browser menu or Share sheet.',
            'Choose “Install app” or “Add to Home Screen.”',
        ],
    };
}

export class PwaInstallController {
    constructor(windowObject) {
        this.browserWindow = getWindow(windowObject);
        this.deferredPrompt = null;
        this.listeners = new Set();
        this.started = false;
    }

    start() {
        if (this.started || !this.browserWindow?.addEventListener) return;
        this.started = true;

        this.browserWindow.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            this.deferredPrompt = event;
            this.notify();
        });

        this.browserWindow.addEventListener('appinstalled', () => {
            this.deferredPrompt = null;
            this.notify();
        });
    }

    canPrompt() {
        return Boolean(this.deferredPrompt);
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(this.canPrompt()));
    }

    async requestInstall() {
        const promptEvent = this.deferredPrompt;
        if (!promptEvent) return { status: 'unavailable' };

        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        this.deferredPrompt = null;
        this.notify();

        return { status: choice?.outcome === 'accepted' ? 'accepted' : 'dismissed' };
    }
}

export const pwaInstall = new PwaInstallController();
