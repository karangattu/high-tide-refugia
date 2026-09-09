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
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3);

    for (const icon of manifest.icons) {
        const localPath = icon.src.replace(/^\//, 'public/');
        assert.ok(fs.existsSync(localPath), `Icon file must exist: ${localPath}`);
    }
});

test('Service worker caches essential assets and handles install, activate, and fetch', () => {
    assert.match(swRaw, /addEventListener\('install'/);
    assert.match(swRaw, /addEventListener\('activate'/);
    assert.match(swRaw, /addEventListener\('fetch'/);
    assert.match(swRaw, /manifest\.webmanifest/);
    assert.match(swRaw, /icon-512\.png/);
});

test('index.html includes manifest link, apple touch icon, and viewport-fit=cover', () => {
    assert.match(indexRaw, /<link\s+rel="manifest"\s+href="\/manifest\.webmanifest"/);
    assert.match(indexRaw, /<link\s+rel="apple-touch-icon"/);
    assert.match(indexRaw, /apple-mobile-web-app-capable/);
    assert.match(indexRaw, /viewport-fit=cover/);
});

test('mobile.js exports fullscreen triggers and responsive device checks', () => {
    assert.match(mobileRaw, /export async function triggerFullscreenAndOrientation\(/);
    assert.match(mobileRaw, /export async function toggleFullscreen\(/);
    assert.match(mobileRaw, /export function isMobileOrTablet\(/);
    assert.match(mobileRaw, /export function isPhonePortrait\(/);
});
