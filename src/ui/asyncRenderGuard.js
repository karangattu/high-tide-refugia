export function nextRenderGeneration(currentGeneration = 0) {
    return currentGeneration + 1;
}

export function canApplyAsyncRender(requestGeneration, currentGeneration, isActive) {
    return isActive && requestGeneration === currentGeneration;
}
