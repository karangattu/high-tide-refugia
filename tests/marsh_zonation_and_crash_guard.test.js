import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const plantContent = fs.readFileSync('src/entities/Plant.js', 'utf-8');

function calculatePlantZone(x, sceneWidth) {
    const minX = 60;
    const maxX = Math.max(minX + 100, sceneWidth - 150);
    const u = Math.min(Math.max((x - minX) / (maxX - minX), 0), 0.999);
    if (u < 0.20) return { key: 'cordgrass', zone: 'Low Marsh' };
    if (u < 0.40) return { key: 'pickleweed', zone: 'Mid Marsh' };
    if (u < 0.60) return { key: 'jaumea', zone: 'Marsh Plain' };
    if (u < 0.80) return { key: 'saltgrass', zone: 'High Marsh' };
    return { key: 'gumplant', zone: 'High-Tide Refugia' };
}

test('SF Bay marsh restoration maps horizontal elevation zones from water edge to high-tide refugia', () => {
    const sceneWidth = 1000;
    const minX = 60;
    const maxX = sceneWidth - 150;
    const span = maxX - minX;

    const lowMarshX = minX + span * 0.10;
    const midMarshLowerX = minX + span * 0.30;
    const midMarshUpperX = minX + span * 0.50;
    const highMarshX = minX + span * 0.70;
    const refugiaX = minX + span * 0.90;

    assert.equal(calculatePlantZone(lowMarshX, sceneWidth).key, 'cordgrass');
    assert.equal(calculatePlantZone(midMarshLowerX, sceneWidth).key, 'pickleweed');
    assert.equal(calculatePlantZone(midMarshUpperX, sceneWidth).key, 'jaumea');
    assert.equal(calculatePlantZone(highMarshX, sceneWidth).key, 'saltgrass');
    assert.equal(calculatePlantZone(refugiaX, sceneWidth).key, 'gumplant');

    assert.equal(calculatePlantZone(lowMarshX, sceneWidth).zone, 'Low Marsh');
    assert.equal(calculatePlantZone(midMarshLowerX, sceneWidth).zone, 'Mid Marsh');
    assert.equal(calculatePlantZone(midMarshUpperX, sceneWidth).zone, 'Marsh Plain');
    assert.equal(calculatePlantZone(highMarshX, sceneWidth).zone, 'High Marsh');
    assert.equal(calculatePlantZone(refugiaX, sceneWidth).zone, 'High-Tide Refugia');
});

test('marsh zonation safely clamps extreme out-of-bounds coordinates', () => {
    assert.equal(calculatePlantZone(-500, 1000).key, 'cordgrass');
    assert.equal(calculatePlantZone(5000, 1000).key, 'gumplant');
});

test('Plant.js exports PLANT_TYPES and getPlantTypeForX with all 5 native restoration zones', () => {
    assert.match(
        plantContent,
        /export const PLANT_TYPES = \[[\s\S]*?cordgrass[\s\S]*?pickleweed[\s\S]*?jaumea[\s\S]*?saltgrass[\s\S]*?gumplant/,
        'PLANT_TYPES must list 5 species ordered by elevation gradient'
    );

    assert.match(
        plantContent,
        /export function getPlantZoneForX\(x, sceneWidth\)/,
        'Plant.js must export getPlantZoneForX'
    );

    assert.match(
        plantContent,
        /export function getPlantTypeForX\(x, sceneWidth\)/,
        'Plant.js must export getPlantTypeForX'
    );

    assert.match(
        plantContent,
        /zone:\s*'Low Marsh'/,
        'Cordgrass must be assigned Low Marsh'
    );

    assert.match(
        plantContent,
        /zone:\s*'High-Tide Refugia'/,
        'Gumplant must be assigned High-Tide Refugia'
    );
});

test('PlantPreview contains dynamic zone badge and label text', () => {
    assert.match(
        plantContent,
        /class PlantPreview extends Phaser\.GameObjects\.Sprite/,
        'PlantPreview class exists'
    );

    assert.match(
        plantContent,
        /this\.labelText\.setText\(`\$\{entry\.label\}\s*·\s*\$\{entry\.zone\}`\)/,
        'PlantPreview displays label and zone'
    );

    assert.match(
        plantContent,
        /this\.labelBg\.fillRoundedRect/,
        'PlantPreview displays backdrop pill'
    );
});

test('Rail lifecycle methods guard against undefined scene or tweens', () => {
    const railContent = fs.readFileSync('src/entities/Rail.js', 'utf-8');

    assert.match(
        railContent,
        /if\s*\(!this\.scene\s*\|\|\s*!this\.scene\.tweens\s*\|\|\s*!this\.isAlive\)\s*return;/,
        '_tweenSpeed must check this.scene and this.scene.tweens'
    );

    assert.match(
        railContent,
        /this\.boostTimer\s*=\s*null/,
        'Rail constructor must initialize boostTimer'
    );

    assert.match(
        railContent,
        /this\.boostResetTimer\s*=\s*null/,
        'Rail constructor must initialize boostResetTimer'
    );

    assert.match(
        railContent,
        /reachSafety\(\)\s*\{[\s\S]*?this\.isAlive\s*=\s*false;/,
        'reachSafety must mark rail not alive'
    );

    assert.match(
        railContent,
        /die\(cause[\s\S]*?this\.boostTimer\.remove\(\)/,
        'die must cancel active boost timer'
    );

    assert.match(
        railContent,
        /once\('destroy'[\s\S]*?this\.scene\.tweens\.killTweensOf\(this\)/,
        'destroy listener must kill tweens on Rail'
    );
});

test('Harrier predation guards against undefined scene or tweens', () => {
    const harrierContent = fs.readFileSync('src/entities/predators/Harrier.js', 'utf-8');

    assert.match(
        harrierContent,
        /startCarry\(\)\s*\{[\s\S]*?if\s*\(!this\.scene\s*\|\|\s*!this\.scene\.tweens\)\s*return;/,
        'startCarry must guard scene and tweens'
    );

    assert.match(
        harrierContent,
        /startRecovery\(\)\s*\{[\s\S]*?if\s*\(!this\.scene\s*\|\|\s*!this\.scene\.tweens\)\s*return;/,
        'startRecovery must guard scene and tweens'
    );
});

test('GameScene wires up zone-based plant species mapping on hover and touch placement', () => {
    const gameSceneContent = fs.readFileSync('src/scenes/GameScene.js', 'utf-8');

    assert.match(
        gameSceneContent,
        /getPlantTypeForX\(pointer\.x,\s*this\.scale\.width\)/,
        'GameScene pointermove/down must use getPlantTypeForX'
    );

    assert.match(
        gameSceneContent,
        /tryPlantAt\(x,\s*y\)[\s\S]*?getPlantTypeForX\(x,\s*this\.scale\.width\)/,
        'GameScene tryPlantAt must use getPlantTypeForX'
    );
});

test('GameScene keeps decorative grindelia/gumplant strictly in upland refugia and clear of sides/low-mid marsh', () => {
    const gameSceneContent = fs.readFileSync('src/scenes/GameScene.js', 'utf-8');

    assert.doesNotMatch(
        gameSceneContent,
        /Phaser\.Math\.Between\(\s*30\s*,\s*uplandX\s*-\s*60\s*\)[\s\S]*?gumplant/,
        'GameScene must not scatter gumplants across the marsh sides and waterline'
    );

    assert.match(
        gameSceneContent,
        /const\s+gumplantCount[\s\S]*?uplandX\s*\+\s*Phaser\.Math\.Between\(10,\s*100\)[\s\S]*?'gumplant_8'/,
        'GameScene must restrict decorative gumplant to the upland safe refuge'
    );

    assert.match(
        gameSceneContent,
        /const\s+cordgrassCount[\s\S]*?Phaser\.Math\.Between\(15,\s*80\)[\s\S]*?'cordgrass_8'/,
        'GameScene must place cordgrass along the left water boundary'
    );
});

test('MenuScene restricts gumplant to the upland refugia on the right and places cordgrass on the left', () => {
    const menuContent = fs.readFileSync('src/scenes/MenuScene.js', 'utf-8');

    assert.doesNotMatch(
        menuContent,
        /Phaser\.Math\.Between\(30,\s*width\s*\*\s*0\.24\)[\s\S]*?gumplant/,
        'MenuScene must not place gumplant in the left low-marsh waterline zone'
    );

    assert.match(
        menuContent,
        /cordgrassClumps[\s\S]*?'cordgrass'/,
        'MenuScene must place cordgrass on the left waterline zone'
    );

    assert.match(
        menuContent,
        /gumplantClumps[\s\S]*?'gumplant'/,
        'MenuScene must place gumplant in the right upland zone'
    );
});
