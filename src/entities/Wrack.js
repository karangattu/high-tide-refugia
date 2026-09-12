import * as Phaser from 'phaser';

/**
 * A floating mat of marsh wrack that drifts in on a king tide. Wrack is not a
 * permanent refugium: it shelters any rail standing on it for a short while
 * before the tide drags it under.
 */
export class Wrack extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'wrack');

        scene.add.existing(this);
        this.setDepth(2);
        this.setScale(Phaser.Math.FloatBetween(1.1, 1.5));

        this.isWrack = true;
        this.coverRadius = 48;
    }

    isCover() {
        return this.active;
    }

    getCoverRadius() {
        return this.coverRadius;
    }
}
