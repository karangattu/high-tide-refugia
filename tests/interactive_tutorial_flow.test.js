import { test } from 'node:test';
import assert from 'node:assert/strict';

const tutorialModule = await import('../src/systems/TutorialFlow.js').catch(() => null);

test('tutorial requires five unique refuge patches before the rail demonstration', () => {
    assert.ok(tutorialModule?.TutorialFlow, 'TutorialFlow must be implemented');
    const targets = [
        { id: 0, x: 100, y: 200 },
        { id: 1, x: 200, y: 200 },
        { id: 2, x: 300, y: 200 },
        { id: 3, x: 400, y: 200 },
        { id: 4, x: 500, y: 200 },
    ];
    const flow = new tutorialModule.TutorialFlow(targets);

    assert.equal(flow.stage, 'observe');
    assert.equal(flow.claimTarget(100, 200), null, 'planting is locked during predator observation');

    flow.beginPlanting();
    for (let i = 0; i < 4; i++) {
        assert.equal(flow.claimTarget(targets[i].x, targets[i].y).id, i);
        assert.equal(flow.stage, 'plant');
    }

    assert.equal(flow.claimTarget(100, 200), null, 'the same target cannot count twice');
    assert.equal(flow.claimTarget(500, 200).id, 4);
    assert.equal(flow.stage, 'demonstrate');
    assert.equal(flow.placements, 5);

    assert.equal(flow.completeDemonstration(), true);
    assert.equal(flow.stage, 'complete');
});

test('tutorial planting snaps only to nearby available targets', () => {
    assert.ok(tutorialModule?.TutorialFlow, 'TutorialFlow must be implemented');
    const flow = new tutorialModule.TutorialFlow([
        { id: 0, x: 120, y: 180 },
        { id: 1, x: 240, y: 180 },
    ]);
    flow.beginPlanting();

    assert.equal(flow.findAvailableTarget(20, 20), null);
    assert.deepEqual(flow.findAvailableTarget(132, 175), { id: 0, x: 120, y: 180 });
    assert.deepEqual(flow.claimTarget(132, 175), { id: 0, x: 120, y: 180 });
    assert.equal(flow.findAvailableTarget(120, 180), null);
});

test('tutorial target layout creates five evenly spaced patches on one rail route', () => {
    assert.ok(tutorialModule?.createTutorialPlantTargets, 'target layout helper must be implemented');
    assert.deepEqual(
        tutorialModule.createTutorialPlantTargets(100, 500, 220, 5),
        [
            { id: 0, x: 100, y: 220 },
            { id: 1, x: 200, y: 220 },
            { id: 2, x: 300, y: 220 },
            { id: 3, x: 400, y: 220 },
            { id: 4, x: 500, y: 220 },
        ]
    );
});
