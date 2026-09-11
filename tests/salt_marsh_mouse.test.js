import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mouseModulePath = new URL('../src/effects/SaltMarshMouseRun.js', import.meta.url);

test('one small, non-physics mouse runs every 15 seconds', async () => {
    assert.ok(
        fs.existsSync(mouseModulePath),
        'the salt marsh mouse run effect must exist'
    );

    const { scheduleSaltMarshMouseRuns } = await import(mouseModulePath);
    assert.equal(
        typeof scheduleSaltMarshMouseRuns,
        'function',
        'the mouse effect must expose a repeating time-based scheduler'
    );

    const sprites = [];
    const tweens = [];
    let clockNow = 0;
    const clockEvents = [];
    const scene = {
        scale: { width: 1200, height: 700 },
        marshTop: 150,
        marshBottom: 600,
        isPaused: false,
        isGameOver: false,
        add: {
            sprite(x, y, texture) {
                const sprite = {
                    x,
                    y,
                    texture,
                    displayWidth: 356,
                    destroyed: false,
                    setScale(scale) {
                        this.scale = scale;
                        this.displayWidth *= scale;
                        return this;
                    },
                    setDepth(depth) {
                        this.depth = depth;
                        return this;
                    },
                    play(animation) {
                        this.animation = animation;
                        return this;
                    },
                    destroy() {
                        this.destroyed = true;
                    },
                };
                sprites.push(sprite);
                return sprite;
            },
        },
        tweens: {
            add(config) {
                tweens.push(config);
                return config;
            },
        },
        time: {
            addEvent(config) {
                const event = {
                    ...config,
                    nextRun: clockNow + config.delay,
                    removed: false,
                    remove() {
                        this.removed = true;
                    },
                };
                clockEvents.push(event);
                return event;
            },
        },
    };
    const advanceClock = (milliseconds) => {
        clockNow += milliseconds;
        for (const event of clockEvents) {
            while (!event.removed && clockNow >= event.nextRun) {
                event.callback();
                if (!event.loop) {
                    event.removed = true;
                    break;
                }
                event.nextRun += event.delay;
            }
        }
    };

    scheduleSaltMarshMouseRuns(scene);
    advanceClock(14_999);
    assert.equal(sprites.length, 0, 'no mouse appears before 15 seconds');
    advanceClock(1);
    assert.equal(sprites.length, 1, 'the first mouse appears at 15 seconds');
    advanceClock(15_000);

    assert.equal(sprites.length, 2, 'another mouse appears after each 15-second interval');
    assert.equal(tweens.length, 2, 'each mouse gets one crossing tween');

    for (let i = 0; i < sprites.length; i++) {
        const mouse = sprites[i];
        const tween = tweens[i];
        assert.equal(mouse.texture, 'saltie_run_1');
        assert.equal(mouse.animation, 'saltie_run');
        assert.ok(mouse.displayWidth < 48, 'mouse stays less than half the visual width of a rail');
        assert.ok(mouse.x < 0, 'mouse starts fully off the left edge');
        assert.ok(tween.x > scene.scale.width, 'mouse finishes fully off the right edge');
        assert.ok(tween.duration <= 1000, 'mouse crosses the screen really fast');
        assert.equal('physics' in mouse, false, 'mouse has no physics body for predators to catch');

        tween.onComplete();
        assert.equal(mouse.destroyed, true, 'mouse is removed after its run');
    }
});
