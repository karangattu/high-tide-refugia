import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function getFilesRecursively(dir, extension = '.js') {
    let files = [];
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            files = files.concat(getFilesRecursively(fullPath, extension));
        } else if (item.name.endsWith(extension)) {
            files.push(fullPath);
        }
    }
    return files;
}

test('all source files use Mona Sans and contain zero references to Outfit', () => {
    const srcFiles = getFilesRecursively('src');
    for (const file of srcFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        assert.doesNotMatch(content, /['"]Outfit['"]/, `${file} should not reference Outfit font`);
    }

    const indexHtml = fs.readFileSync('index.html', 'utf-8');
    assert.doesNotMatch(indexHtml, /Outfit/, 'index.html should not reference Outfit font');
    assert.match(indexHtml, /Mona Sans/, 'index.html must reference Mona Sans');
});

test('package.json and main.js configure Mona Sans font package', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    assert.ok(pkg.dependencies['@fontsource/mona-sans'], 'package.json must declare @fontsource/mona-sans');

    const mainJs = fs.readFileSync('src/main.js', 'utf-8');
    assert.match(mainJs, /import\s+['"]@fontsource\/mona-sans\/index\.css['"]/, 'main.js must import Mona Sans css');
});

test('GameScene tutorial arrow renders actual unicode character and not escaped literal', () => {
    const content = fs.readFileSync('src/scenes/GameScene.js', 'utf-8');
    assert.doesNotMatch(content, /\\u25bc/, 'GameScene.js must not contain raw escaped \\u25bc string');
    assert.match(content, /'▼'/, 'GameScene.js must contain literal unicode arrow ▼');
});

test('UIScene footer brand layout prevents overlap with center tips', () => {
    const content = fs.readFileSync('src/scenes/UIScene.js', 'utf-8');
    assert.match(content, /RIDGWAY'S RAIL REFUGE/, 'UIScene.js must use concise brand string');
    assert.doesNotMatch(content, /SAN FRANCISCO BAY ESTUARY · RIDGWAY'S RAIL REFUGE/, 'UIScene.js should not use overlapping lengthy brand string');
});

test('GameOverScene widescreen layout and portrait stat coordinates avoid overlap', () => {
    const content = fs.readFileSync('src/scenes/GameOverScene.js', 'utf-8');
    assert.match(content, /width\s*>=\s*680\s*&&\s*width\s*>\s*height/, 'GameOverScene must handle widescreen landscape layouts');
    assert.match(content, /const\s+survivalY\s*=/, 'GameOverScene must calculate survivalY dynamically');
    assert.match(content, /fontFamily:\s*['"]Mona Sans['"]/, 'GameOverScene must use Mona Sans');
});
