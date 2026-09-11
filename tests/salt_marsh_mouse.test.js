import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LevelManager } from '../src/systems/LevelManager.js';

const mouseModulePath = new URL('../src/effects/SaltMarshMouseRun.js', import.meta.url);

test('every third wave launches one fast, non-physics mouse run', async () => {
    assert.ok(
        fs.existsSync(mouseModulePath),
        'the salt marsh mouse run effect must exist'
    );

    const { advanceWaveWithMouseRun } = await import(mouseModulePath);
    const sprites = [];
    const tweens = [];
    const scene = {
        scale: { width: 1200, height: 700 },
        marshTop: 150,
        marshBottom: 600,
        levelManager: new LevelManager({}),
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
    };
    scene.levelManager.startLevel();

    for (let wave = 1; wave <= 6; wave++) {
        advanceWaveWithMouseRun(scene);
    }

    assert.equal(sprites.length, 2, 'waves 3 and 6 each launch one mouse');
    assert.equal(tweens.length, 2, 'each mouse gets one crossing tween');

    for (let i = 0; i < sprites.length; i++) {
        const mouse = sprites[i];
        const tween = tweens[i];
        assert.equal(mouse.texture, 'saltie_run_1');
        assert.equal(mouse.animation, 'saltie_run');
        assert.ok(mouse.x < 0, 'mouse starts fully off the left edge');
        assert.ok(tween.x > scene.scale.width, 'mouse finishes fully off the right edge');
        assert.ok(tween.duration <= 1000, 'mouse crosses the screen really fast');
        assert.equal('physics' in mouse, false, 'mouse has no physics body for predators to catch');

        tween.onComplete();
        assert.equal(mouse.destroyed, true, 'mouse is removed after its run');
    }
});
