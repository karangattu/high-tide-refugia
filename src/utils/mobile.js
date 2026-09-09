export async function triggerFullscreenAndOrientation() {
    try {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            const el = document.documentElement;
            if (el.requestFullscreen) {
                await el.requestFullscreen({ navigationUI: 'hide' });
            } else if (el.webkitRequestFullscreen) {
                await el.webkitRequestFullscreen();
            }
        }
    } catch {
        return;
    }

    try {
        if (typeof window !== 'undefined' && window.screen?.orientation?.lock) {
            await window.screen.orientation.lock('landscape');
        }
    } catch {
        return;
    }
}

export async function toggleFullscreen() {
    try {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            await triggerFullscreenAndOrientation();
        } else {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                await document.webkitExitFullscreen();
            }
        }
    } catch {
        return;
    }
}

export function isMobileOrTablet() {
    if (typeof window === 'undefined') return false;
    const hasTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    const isSmall = Math.min(window.innerWidth, window.innerHeight) <= 1024;
    return hasTouch || isSmall;
}

export function isPhonePortrait(maxDimension = 600) {
    if (typeof window === 'undefined') return false;
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    const smallestSide = Math.min(window.innerWidth, window.innerHeight);

    return isTouchDevice
        && smallestSide <= maxDimension
        && window.innerHeight > window.innerWidth;
}

// Compact viewports (phones in landscape, small windows) get smaller
// bird/predator sprites so there is more playable marsh space.
// Matches the isMobileLandscape thresholds used in GameScene.
export const MOBILE_ENTITY_SCALE = 0.65;

export function isCompactViewport(width, height) {
    const w = width ?? (typeof window !== 'undefined' ? window.innerWidth : 1280);
    const h = height ?? (typeof window !== 'undefined' ? window.innerHeight : 800);
    return h <= 520 || (w < 768 && h < 600);
}

export function getEntityScaleFactor(width, height) {
    return isCompactViewport(width, height) ? MOBILE_ENTITY_SCALE : 1;
}
