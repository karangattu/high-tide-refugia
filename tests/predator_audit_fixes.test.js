import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const catContent = fs.readFileSync('src/entities/predators/Cat.js', 'utf-8');
const foxContent = fs.readFileSync('src/entities/predators/Fox.js', 'utf-8');
const harrierContent = fs.readFileSync('src/entities/predators/Harrier.js', 'utf-8');
const gameSceneContent = fs.readFileSync('src/scenes/GameScene.js', 'utf-8');

test('GameScene beginNextWave propagates custom cat vision and chase speed', () => {
    assert.match(
        gameSceneContent,
        /catVisionRange:\s*profile\.catVisionRange/,
        'beginNextWave must pass catVisionRange from profile'
    );
    assert.match(
        gameSceneContent,
        /catChaseSpeed:\s*profile\.catChaseSpeed/,
        'beginNextWave must pass catChaseSpeed from profile'
    );
});

test('Ground and aerial predators ignore rails in safe zone or with hasReachedSafety', () => {
    for (const [name, content] of [['Cat', catContent], ['Fox', foxContent], ['Harrier', harrierContent]]) {
        assert.match(
            content,
            /rail\.hasReachedSafety/,
            `${name} searchForPrey must ignore rails that reached safety`
        );
        assert.match(
            content,
            /rail\.isBeingCaught/,
            `${name} searchForPrey must ignore rails already being caught`
        );
    }
});

test('Cat and Fox abort chase when target reaches safe zone or is caught', () => {
    assert.match(
        catContent,
        /this\.target\.hasReachedSafety/,
        'Cat chase must abort when target reaches safety'
    );
    assert.match(
        catContent,
        /this\.target\.isBeingCaught/,
        'Cat chase must abort when target is being caught'
    );
    assert.match(
        catContent,
        /this\.target\.x\s*>=\s*safeZoneX/,
        'Cat chase must abort when target crosses safeZoneX'
    );

    assert.match(
        foxContent,
        /this\.target\.hasReachedSafety/,
        'Fox chase must abort when target reaches safety'
    );
    assert.match(
        foxContent,
        /this\.target\.isBeingCaught/,
        'Fox chase must abort when target is being caught'
    );
    assert.match(
        foxContent,
        /this\.target\.x\s*>=\s*maxMarshX/,
        'Fox chase must abort when target crosses maxMarshX'
    );
});

test('Predators recognize floating wrack mats as protective cover', () => {
    for (const [name, content] of [['Cat', catContent], ['Fox', foxContent], ['Harrier', harrierContent]]) {
        assert.match(
            content,
            /this\.scene\?\.wrack/,
            `${name} must inspect wrack mats for cover`
        );
    }
});

test('Predator catch routines set isBeingCaught on targets', () => {
    for (const [name, content] of [['Cat', catContent], ['Fox', foxContent], ['Harrier', harrierContent]]) {
        assert.match(
            content,
            /isBeingCaught\s*=\s*true/,
            `${name} must set isBeingCaught on prey`
        );
    }
});

test('Cat enforces right-side marsh boundary clamp in update', () => {
    assert.match(
        catContent,
        /const maxMarshX\s*=\s*this\.scene\?\.safeZoneX/,
        'Cat must define maxMarshX from safeZoneX'
    );
    assert.match(
        catContent,
        /if\s*\(\s*this\.x\s*>\s*maxMarshX\s*\)\s*\{[\s\S]*?this\.x\s*=\s*maxMarshX/,
        'Cat must clamp position to maxMarshX'
    );
});

test('Harrier carry routine enforces horizontal boundary limits', () => {
    assert.match(
        harrierContent,
        /carry\(delta\)[\s\S]*?if\s*\(\s*this\.x\s*>=\s*this\.maxX\s*\)[\s\S]*?glideDirection\s*=\s*-1/,
        'Harrier carry must turn around at maxX'
    );
    assert.match(
        harrierContent,
        /carry\(delta\)[\s\S]*?else\s+if\s*\(\s*this\.x\s*<=\s*this\.minX\s*\)[\s\S]*?glideDirection\s*=\s*1/,
        'Harrier carry must turn around at minX'
    );
});

test('GameScene update checks safe zone before predator updates', () => {
    const updateBodyMatch = gameSceneContent.match(/update\(time,\s*delta\)\s*\{([\s\S]*?)\n    updatePlantWaterState/);
    assert.ok(updateBodyMatch, 'update method must exist in GameScene');
    const updateBody = updateBodyMatch[1];
    const checkSafeZoneIdx = updateBody.indexOf('this.checkSafeZone();');
    const predatorUpdateIdx = updateBody.indexOf('this.groundPredators.children.entries.forEach');
    assert.ok(checkSafeZoneIdx !== -1, 'checkSafeZone must exist in GameScene update');
    assert.ok(predatorUpdateIdx !== -1, 'predator update loop must exist in GameScene update');
    assert.ok(checkSafeZoneIdx < predatorUpdateIdx, 'checkSafeZone must precede predator update');
});
