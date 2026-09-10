import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const deployWorkflow = fs.readFileSync('.github/workflows/deploy.yml', 'utf-8');
const testWorkflow = fs.readFileSync('.github/workflows/test.yml', 'utf-8');

test('deploy.yml upgrades all GitHub Actions to their latest versions', () => {
    assert.match(deployWorkflow, /uses:\s*actions\/checkout@v7/);
    assert.match(deployWorkflow, /uses:\s*actions\/setup-node@v7/);
    assert.match(deployWorkflow, /uses:\s*actions\/upload-pages-artifact@v5/);
    assert.match(deployWorkflow, /uses:\s*actions\/deploy-pages@v5/);
    assert.doesNotMatch(deployWorkflow, /actions\/checkout@v[1-6]/);
    assert.doesNotMatch(deployWorkflow, /actions\/setup-node@v[1-6]/);
    assert.doesNotMatch(deployWorkflow, /actions\/upload-pages-artifact@v[1-4]/);
    assert.doesNotMatch(deployWorkflow, /actions\/deploy-pages@v[1-4]/);
});

test('test.yml defines a parallel GitHub Action workflow that runs tests', () => {
    assert.ok(fs.existsSync('.github/workflows/test.yml'));
    assert.match(testWorkflow, /name:\s*Test/);
    assert.match(testWorkflow, /branches:\s*\[main\]/);
    assert.match(testWorkflow, /pull_request:/);
    assert.match(testWorkflow, /workflow_dispatch:/);
    assert.match(testWorkflow, /uses:\s*actions\/checkout@v7/);
    assert.match(testWorkflow, /uses:\s*actions\/setup-node@v7/);
    assert.match(testWorkflow, /uses:\s*actions\/setup-python@v7/);
    assert.match(testWorkflow, /run:\s*npm ci/);
    assert.match(testWorkflow, /run:\s*npm test/);
});
