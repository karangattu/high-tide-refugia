import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AUTHENTIC_MARSH_FACTS, getRandomMarshFact, getMarshTickerString } from '../src/data/marshFacts.js';

test('AUTHENTIC_MARSH_FACTS dataset contains authentic facts for Ridgway\'s rail and 5 marsh plants', () => {
    assert.ok(Array.isArray(AUTHENTIC_MARSH_FACTS));
    assert.ok(AUTHENTIC_MARSH_FACTS.length >= 12);

    const speciesSet = new Set(AUTHENTIC_MARSH_FACTS.map(f => f.species));
    assert.ok(speciesSet.has("Ridgway's Rail"));
    assert.ok(speciesSet.has("Pacific Cordgrass"));
    assert.ok(speciesSet.has("Pacific Pickleweed"));
    assert.ok(speciesSet.has("Saltgrass"));
    assert.ok(speciesSet.has("Marsh Jaumea"));
    assert.ok(speciesSet.has("Marsh Gumplant"));

    for (const item of AUTHENTIC_MARSH_FACTS) {
        assert.ok(item.species && typeof item.species === 'string');
        assert.ok(item.scientificName && typeof item.scientificName === 'string');
        assert.ok(item.headline && typeof item.headline === 'string');
        assert.ok(item.fact && typeof item.fact === 'string' && item.fact.length > 30);
        assert.ok(item.ticker && typeof item.ticker === 'string' && item.ticker.length > 20);
    }
});

test('getRandomMarshFact returns valid fact object and respects excludeIndex', () => {
    const fact1 = getRandomMarshFact();
    assert.ok(fact1);
    assert.ok(fact1.species);
    assert.ok(fact1.headline);
    assert.ok(fact1.fact);
    assert.ok(typeof fact1.index === 'number');

    for (let i = 0; i < 20; i++) {
        const nextFact = getRandomMarshFact(0);
        assert.notEqual(nextFact.index, 0);
    }
});

test('getMarshTickerString formats all ticker entries with separators', () => {
    const tickerStr = getMarshTickerString();
    assert.ok(typeof tickerStr === 'string');
    assert.ok(tickerStr.includes('◆'));
    assert.ok(tickerStr.includes('RAIL:'));
    assert.ok(tickerStr.includes('CORDGRASS:'));
    assert.ok(tickerStr.includes('PICKLEWEED:'));
    assert.ok(tickerStr.includes('GUMPLANT:'));
});

test('UIScene creates masked ticker and updates position with delta wrap', () => {
    const content = fs.readFileSync('src/scenes/UIScene.js', 'utf-8');
    assert.match(content, /AUTHENTIC_MARSH_FACTS/, 'UIScene must import and use authentic marsh facts');
    assert.match(content, /setMask\(this\.tickerMask\)/, 'UIScene must set geometry mask on ticker items');
    assert.match(content, /tickerItems/, 'UIScene must manage ticker items');
    assert.match(content, /update\s*\(\s*time,\s*delta\s*\)/, 'UIScene must define update lifecycle for scrolling');
});

test('GameOverScene implements visualViewport listener and elevation for onscreen keyboard', () => {
    const content = fs.readFileSync('src/scenes/GameOverScene.js', 'utf-8');
    assert.match(content, /visualViewport/, 'GameOverScene must inspect visualViewport for soft keyboard');
    assert.match(content, /_cleanNameFormListeners/, 'GameOverScene must clean up keyboard and resize listeners');
    assert.match(content, /addEventListener\(\s*['"]focus['"]/, 'GameOverScene must elevate input on focus');
    assert.match(content, /addEventListener\(\s*['"]blur['"]/, 'GameOverScene must restore input on blur');
});

test('GameScene showMarshFact renders species, headline, and authentic fact object', () => {
    const content = fs.readFileSync('src/scenes/GameScene.js', 'utf-8');
    assert.match(content, /getRandomMarshFact/, 'GameScene must import getRandomMarshFact');
    assert.match(content, /completeLevel\s*\(\s*\)\s*\{[\s\S]*getRandomMarshFact/, 'completeLevel must select authentic marsh fact');
    assert.match(content, /subTitleText/, 'showMarshFact must display species and headline subtitle');
});
