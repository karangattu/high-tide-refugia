import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifestRaw = fs.readFileSync('public/manifest.webmanifest', 'utf-8');
const swRaw = fs.readFileSync('public/sw.js', 'utf-8');
const indexRaw = fs.readFileSync('index.html', 'utf-8');
const mobileRaw = fs.readFileSync('src/utils/mobile.js', 'utf-8');

test('PWA manifest exists, is valid JSON, and has required fullscreen and landscape settings', () => {
    const manifest = JSON.parse(manifestRaw);
    assert.equal(manifest.name, "High Tide Refugia: Save the Ridgway's Rail");
    assert.equal(manifest.short_name, 'Refugia');
    assert.equal(manifest.display, 'fullscreen');
    assert.equal(manifest.orientation, 'landscape');
    assert.equal(manifest.start_url, './');
    assert.equal(manifest.scope, './');
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3);

    for (const icon of manifest.icons) {
        assert.doesNotMatch(icon.src, /^\//, 'Manifest icons must work under the GitHub Pages subdirectory');
        const localPath = `public/${icon.src.replace(/^\.\//, '')}`;
        assert.ok(fs.existsSync(localPath), `Icon file must exist: ${localPath}`);
    }
});

test('Service worker caches essential assets and handles install, activate, and fetch', () => {
    assert.match(swRaw, /addEventListener\('install'/);
    assert.match(swRaw, /addEventListener\('activate'/);
    assert.match(swRaw, /addEventListener\('fetch'/);
    assert.match(swRaw, /manifest\.webmanifest/);
    assert.match(swRaw, /icon-512\.png/);
    assert.match(swRaw, /self\.registration\.scope/);
    assert.doesNotMatch(swRaw, /^\s*['"]\/(?:index\.html|manifest\.webmanifest|icons\/)/m);
});

test('index.html includes manifest link, apple touch icon, and viewport-fit=cover', () => {
    assert.match(indexRaw, /<link\s+rel="manifest"\s+href="\.\/manifest\.webmanifest"/);
    assert.match(indexRaw, /<link\s+rel="apple-touch-icon"/);
    assert.match(indexRaw, /apple-mobile-web-app-capable/);
    assert.match(indexRaw, /viewport-fit=cover/);
});

test('service worker registration follows the deployed page directory', () => {
    const mainRaw = fs.readFileSync('src/main.js', 'utf-8');
    assert.match(mainRaw, /new window\.URL\('\.\/sw\.js',\s*window\.location\.href\)/);
    assert.doesNotMatch(mainRaw, /serviceWorker\.register\('\/sw\.js'\)/);
});

test('mobile.js exports fullscreen triggers and responsive device checks', () => {
    assert.match(mobileRaw, /export async function triggerFullscreenAndOrientation\(/);
    assert.match(mobileRaw, /export async function toggleFullscreen\(/);
    assert.match(mobileRaw, /export function isMobileOrTablet\(/);
    assert.match(mobileRaw, /export function isPhonePortrait\(/);
});

test('Fullscreen requests fire on user-activation events so Android actually enters fullscreen', () => {
    const menuRaw = fs.readFileSync('src/scenes/MenuScene.js', 'utf-8');
    const uiRaw = fs.readFileSync('src/scenes/UIScene.js', 'utf-8');
    const mainRaw = fs.readFileSync('src/main.js', 'utf-8');

    // Touch devices do not grant user activation on pointerdown, so every
    // requestFullscreen call must originate from pointerup or click.
    assert.match(
        menuRaw,
        /btn\.on\('pointerup',\s*\(\)\s*=>\s*\{\s*if\s*\(label\s*===\s*'PLAY'\)\s*\{\s*triggerFullscreenAndOrientation\(\);/,
        'PLAY must trigger fullscreen from pointerup, not pointerdown'
    );
    assert.doesNotMatch(
        menuRaw,
        /btn\.on\('pointerdown',[\s\S]{0,260}?triggerFullscreenAndOrientation/,
        'PLAY must not request fullscreen from pointerdown'
    );
    assert.match(menuRaw, /icon_maximize/, 'Menu must expose a visible fullscreen toggle button');
    assert.match(menuRaw, /toggleFullscreen\(\)/, 'Menu fullscreen button must toggle fullscreen');

    assert.match(
        uiRaw,
        /fsBtn\.on\('pointerup',\s*\(\)\s*=>\s*toggleFullscreen\(\)\)/,
        'In-game fullscreen button must use pointerup'
    );
    assert.match(
        uiRaw,
        /fsContainer\.on\('pointerup',\s*\(\)\s*=>\s*toggleFullscreen\(\)\)/,
        'In-game fullscreen label must use pointerup'
    );
    assert.doesNotMatch(
        uiRaw,
        /on\('pointerdown',\s*\(\)\s*=>\s*toggleFullscreen\(\)\)/,
        'In-game fullscreen must not use pointerdown'
    );

    assert.match(
        mainRaw,
        /addEventListener\('click',\s*triggerAutoFullscreen/,
        'Auto-fullscreen on first interaction must use click (valid activation for touch and mouse)'
    );
    assert.doesNotMatch(
        mainRaw,
        /addEventListener\('(pointerdown|touchstart)',\s*triggerAutoFullscreen/,
        'Auto-fullscreen must not listen on non-activating events'
    );
});
