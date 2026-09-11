const TYPING_CARD_MAX_WIDTH = 520;
const VIEWPORT_MARGIN = 12;

export function getNameEntryLayout({
    focused,
    visualViewport,
    windowViewport,
    canvasRect,
    gameSize,
    anchor,
    inlineWidth,
    rowHeight,
}) {
    const viewport = visualViewport || {
        width: windowViewport.width,
        height: windowViewport.height,
        offsetLeft: 0,
        offsetTop: 0,
    };
    const keyboardVisible = viewport.height < windowViewport.height * 0.82;

    if (focused || keyboardVisible) {
        const width = Math.min(TYPING_CARD_MAX_WIDTH, viewport.width - VIEWPORT_MARGIN * 2);
        return {
            mode: 'typing',
            left: Math.round(viewport.offsetLeft + (viewport.width - width) / 2),
            top: Math.round(viewport.offsetTop + VIEWPORT_MARGIN),
            width: Math.round(width),
        };
    }

    const scaleX = canvasRect.width / gameSize.width;
    const scaleY = canvasRect.height / gameSize.height;
    return {
        mode: 'inline',
        left: Math.round(canvasRect.left + anchor.x * scaleX - inlineWidth / 2),
        top: Math.round(canvasRect.top + anchor.y * scaleY - rowHeight / 2),
        width: inlineWidth,
    };
}
