const ORIENTATION_REFRESH_DELAYS = [0, 160, 420, 800];

export function scheduleOrientationRefresh(
    refresh,
    onSettled = () => {},
    schedule = (callback, delay) => window.setTimeout(callback, delay),
    cancel = id => window.clearTimeout(id)
) {
    const timers = ORIENTATION_REFRESH_DELAYS.map((delay, index) => schedule(() => {
        const isFinal = index === ORIENTATION_REFRESH_DELAYS.length - 1;
        refresh({ delay, isFinal });
        if (isFinal) onSettled();
    }, delay));

    return () => timers.forEach(cancel);
}
