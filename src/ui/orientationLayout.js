export function getOrientationAxis(orientationType, width, height) {
    if (orientationType?.startsWith('portrait')) return 'portrait';
    if (orientationType?.startsWith('landscape')) return 'landscape';
    return width > height ? 'landscape' : 'portrait';
}

export function getGameOverLayoutMode(width, height) {
    return height <= 520 || (width >= 680 && width > height)
        ? 'landscape'
        : 'portrait';
}
