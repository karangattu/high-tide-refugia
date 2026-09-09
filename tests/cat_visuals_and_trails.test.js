import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

test('Cat and GroundPredator chase logic does not spawn red exclamation or trail lines', () => {
    const catContent = fs.readFileSync('src/entities/predators/Cat.js', 'utf-8');
    assert.doesNotMatch(catContent, /#ff0000/);
    assert.doesNotMatch(catContent, /color:\s*['"]#ff0000['"]/);
    assert.doesNotMatch(catContent, /exclaim/);
});

test('cat sprite sheet walking frames have zero border bleed pixels', () => {
    assert.ok(fs.existsSync('public/assets/sprites/cat_with_padding.png'));
    const script = `
from PIL import Image
import numpy as np

img = Image.open('public/assets/sprites/cat_with_padding.png')
arr = np.array(img)
cell_w = 500
cell_h = 507
edge_violations = 0
for i in range(7):
    f = arr[0:cell_h, i*cell_w:(i+1)*cell_w]
    alpha = f[:, :, 3]
    edge_violations += int(np.sum(alpha[0, :] > 0) + np.sum(alpha[-1, :] > 0) + np.sum(alpha[:, 0] > 0) + np.sum(alpha[:, -1] > 0))
print(edge_violations)
`;
    const out = execSync('python3', { input: script }).toString().trim();
    assert.equal(parseInt(out, 10), 0, 'Walking frames must have 0 edge bleed pixels');
});
