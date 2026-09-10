import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const managerRaw = fs.readFileSync('src/systems/HighScoreManager.js', 'utf-8');
const overRaw = fs.readFileSync('src/scenes/GameOverScene.js', 'utf-8');

test('HighScoreManager talks to Supabase with env override and GH Pages fallback keys', () => {
    assert.match(managerRaw, /createClient\(/);
    assert.match(managerRaw, /import\.meta\.env\?\.VITE_SUPABASE_URL/, 'URL must come from Vite env when provided');
    assert.match(managerRaw, /VITE_SUPABASE_PUBLISHABLE_KEY/);
    // GitHub Pages CI runs without secrets, so live fallback constants must exist
    assert.match(managerRaw, /ovwktjjeoowlktdfbuuu\.supabase\.co/);
    assert.match(managerRaw, /sb_publishable_/);
    assert.match(managerRaw, /persistSession:\s*false/);
});

test('Leaderboard keeps one entry per unique name via best-score upsert RPC', () => {
    assert.match(managerRaw, /'rail_refuge_high_scores'/, 'Must target the renamed high-scores table');
    assert.match(managerRaw, /submit_high_score/, 'Must submit through the server-side upsert RPC');
    assert.match(managerRaw, /normalizeName/, 'Names must be normalized so one name maps to one entry');
    assert.match(managerRaw, /\.from\(LEADERBOARD_TABLE\)[\s\S]*?\.order\('score',\s*\{\s*ascending:\s*false\s*\}[\s\S]*?\.limit\(limit\)/,
        'Fetch must order by score descending and limit results');
});

test('Leaderboard shows top 5 and refreshes in realtime on submissions', () => {
    assert.match(overRaw, /for\s*\(let\s*i\s*=\s*0;\s*i\s*<\s*5;\s*i\+\+\)/, 'Rows render the top 5');
    assert.match(managerRaw, /postgres_changes/, 'Realtime subscription must listen to postgres changes');
    assert.match(managerRaw, /subscribeToLeaderboard/);
    assert.match(overRaw, /subscribeToLeaderboard\(\(\)\s*=>\s*\{[\s\S]{0,60}?refreshLeaderboard\(\)/,
        'Game over screen must refetch on realtime events');
    assert.match(overRaw, /createNameEntry/, 'Player must be able to enter a name for their entry');
    assert.match(overRaw, /removeNameForm\(\)/, 'Name form must be cleaned up on scene shutdown');
});
