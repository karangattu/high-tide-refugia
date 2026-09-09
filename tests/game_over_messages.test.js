import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const gameOverContent = fs.readFileSync('src/scenes/GameOverScene.js', 'utf-8');
const gameSceneContent = fs.readFileSync('src/scenes/GameScene.js', 'utf-8');

function evalHeaderInfo(data) {
    const stats = data.stats || {};
    const reason = data.reason || 'Game Over';
    const victory = data.victory || false;

    if (victory) {
        const perfect = (stats.railsLost || 0) === 0;
        return {
            titleText: perfect ? 'PERFECT REFUGE!' : 'TIDE SURVIVED!',
            titleColor: '#2ecc71',
            borderColor: 0x27ae60,
            subText: perfect
                ? 'Flawless restoration! All rails reached safety.'
                : (reason && reason !== 'Game Over'
                    ? reason
                    : 'You guided the rails safely to high-tide refugia!'),
            buttonText: 'PLAY AGAIN',
        };
    }

    const isWaterLoss = reason && (
        reason.toLowerCase().includes('tide') ||
        reason.toLowerCase().includes('water') ||
        reason.toLowerCase().includes('submerge')
    );

    if (isWaterLoss) {
        return {
            titleText: 'REFUGE FLOODED',
            titleColor: '#e74c3c',
            borderColor: 0xc0392b,
            subText: 'The king tide rose too high before enough rails reached safety.',
            buttonText: 'TRY AGAIN',
        };
    }

    return {
        titleText: 'TOO MANY RAILS LOST',
        titleColor: '#e74c3c',
        borderColor: 0xc0392b,
        subText: 'Plant continuous plant cover so rails can shelter from predators.',
        buttonText: 'TRY AGAIN',
    };
}

test('Defeat with saved rails does NOT display TIDE SURVIVED', () => {
    const header = evalHeaderInfo({
        stats: { railsSaved: 3, railsLost: 6 },
        reason: 'Too many rails were lost to predators.',
        victory: false,
    });

    assert.equal(header.titleText, 'TOO MANY RAILS LOST');
    assert.notEqual(header.titleText, 'TIDE SURVIVED!');
    assert.equal(header.titleColor, '#e74c3c');
    assert.equal(header.borderColor, 0xc0392b);
    assert.equal(header.buttonText, 'TRY AGAIN');
});

test('Defeat by rising water displays REFUGE FLOODED', () => {
    const header = evalHeaderInfo({
        stats: { railsSaved: 2, railsLost: 1 },
        reason: 'The king tide submerged the safe refuge.',
        victory: false,
    });

    assert.equal(header.titleText, 'REFUGE FLOODED');
    assert.notEqual(header.titleText, 'TIDE SURVIVED!');
    assert.equal(header.titleColor, '#e74c3c');
    assert.equal(header.buttonText, 'TRY AGAIN');
});

test('Victory displays TIDE SURVIVED or PERFECT REFUGE with green theme and PLAY AGAIN', () => {
    const victoryWithCasualties = evalHeaderInfo({
        stats: { railsSaved: 12, railsLost: 2 },
        reason: 'You guided the rails safely to high-tide refugia!',
        victory: true,
    });

    assert.equal(victoryWithCasualties.titleText, 'TIDE SURVIVED!');
    assert.equal(victoryWithCasualties.titleColor, '#2ecc71');
    assert.equal(victoryWithCasualties.borderColor, 0x27ae60);
    assert.equal(victoryWithCasualties.buttonText, 'PLAY AGAIN');

    const perfectRun = evalHeaderInfo({
        stats: { railsSaved: 15, railsLost: 0 },
        victory: true,
    });

    assert.equal(perfectRun.titleText, 'PERFECT REFUGE!');
    assert.equal(perfectRun.titleColor, '#2ecc71');
    assert.equal(perfectRun.subText, 'Flawless restoration! All rails reached safety.');
});

test('GameOverScene source code defines getHeaderInfo and eliminates flawed railsSaved > 0 ternary', () => {
    assert.match(
        gameOverContent,
        /getHeaderInfo\(\)\s*\{/,
        'GameOverScene must implement getHeaderInfo'
    );

    assert.doesNotMatch(
        gameOverContent,
        /this\.stats\.railsSaved\s*>\s*0\s*\?\s*'TIDE SURVIVED!'/,
        'GameOverScene must not evaluate TIDE SURVIVED merely based on railsSaved > 0'
    );

    assert.match(
        gameOverContent,
        /TOO MANY RAILS LOST/,
        'GameOverScene must declare TOO MANY RAILS LOST title'
    );

    assert.match(
        gameOverContent,
        /REFUGE FLOODED/,
        'GameOverScene must declare REFUGE FLOODED title'
    );
});

test('GameScene explicitly passes victory boolean to GameOverScene', () => {
    assert.match(
        gameSceneContent,
        /gameWon\(\)[\s\S]*?victory:\s*true/,
        'gameWon must pass victory: true'
    );

    assert.match(
        gameSceneContent,
        /gameOver\(reason\)[\s\S]*?victory:\s*false/,
        'gameOver must pass victory: false'
    );
});
