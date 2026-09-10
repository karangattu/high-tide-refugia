import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf-8');

function extractTips(content) {
    const match = content.match(/var tips = \[([\s\S]*?)\];/);
    if (!match) return [];
    return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

test('loading screen exposes a rotatable tip element', () => {
    assert.match(html, /id="loading-tip"/, 'loading tip must have an id for rotation');
    assert.match(html, /rotateLoadingFacts/, 'loading screen must run a fact rotation script');
});

test('loading screen rotates between multiple random facts', () => {
    const tips = extractTips(html);

    assert.ok(tips.length >= 5, `expected several loading facts, found ${tips.length}`);
    assert.ok(
        tips.every((tip) => tip.trim().length > 20),
        'each loading fact should be a readable sentence'
    );
    assert.equal(new Set(tips).size, tips.length, 'loading facts must be unique');

    assert.match(html, /Math\.random\(\)/, 'loading facts must be chosen randomly');
    assert.match(html, /setInterval\([\s\S]*?intervalMs\)/, 'loading facts must rotate on an interval');
    assert.match(html, /el\.style\.opacity\s*=\s*'0'/, 'rotation must fade out before swapping facts');
    assert.match(
        html,
        /MutationObserver[\s\S]*?clearInterval\(timer\)/,
        'rotation must stop once the loading screen is dismissed'
    );
});

test('loading screen starts on a random fact instead of one fixed sentence', () => {
    const tips = extractTips(html);
    const startingTip = 'Ridgway\'s Rails are endangered birds that depend on marshes for survival';

    assert.ok(
        !tips.some((tip) => tip.includes(startingTip)),
        'the old single loading sentence must not remain as the only tip'
    );

    assert.match(
        html,
        /var index = Math\.floor\(Math\.random\(\) \* tips\.length\)/,
        'first shown fact must be random'
    );
});
