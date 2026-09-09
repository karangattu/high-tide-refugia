import * as Phaser from 'phaser';

const CAT_BASE_SCALE = 0.28;
const CAT_CHASE_SCALE = 0.31;
const CAT_ALERT_SCALE = 0.34;
const CAT_ATTACK_SCALE_X = 0.35;
const CAT_ATTACK_SCALE_Y = 0.29;

class GroundPredator extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, patrolMinX, patrolMaxX, texture) {
        super(scene, x, y, texture, 0);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.baseScale = CAT_BASE_SCALE;
        this.chaseScale = CAT_CHASE_SCALE;
        this.alertScale = CAT_ALERT_SCALE;
        this.attackScaleX = CAT_ATTACK_SCALE_X;
        this.attackScaleY = CAT_ATTACK_SCALE_Y;

        this.setScale(this.baseScale);
        this.setDepth(4);

        this.body.setSize(200, 200);
        this.body.setOffset(150, 200);

        this.initialPatrolMinX = patrolMinX;
        this.initialPatrolMaxX = patrolMaxX;
        this.patrolMinX = patrolMinX;
        this.patrolMaxX = patrolMaxX;
        this.patrolSpan = Math.max(100, patrolMaxX - patrolMinX);
        this.homeY = y;
        this.patrolSpeed = 90;
        this.chaseSpeed = 280;

        this.state = 'patrol';
        this.target = null;
        this.cooldownTimer = 0;
        this.visionRange = 150;
        this.visionAngle = Math.PI / 3;

        this.animationTimer = 0;
        this.currentFrame = 0;
        this.walkingFrames = [0, 1, 2, 3];
        this.animationSpeed = 80;

        this.body.setVelocityX(this.patrolSpeed);
        this.setFlipX(false);

        this.shadow = scene.add.image(x, y, 'shadow')
            .setAlpha(0.3)
            .setDepth(-1);
        this.once('destroy', () => {
            if (this.shadow) this.shadow.destroy();
            this.shadow = null;
        });
    }

    getWaterXAtCat() {
        if (!this.scene || !this.scene.waterSystem) return 0;
        return this.scene.waterSystem.getWaterX(this.y);
    }

    update(time, delta, rails) {
        if (!this.scene || !this.body) return;

        const marshTop = this.scene.marshTop !== undefined ? this.scene.marshTop : 100;
        const marshBottom = this.scene.marshBottom !== undefined ? this.scene.marshBottom : (this.scene.scale?.height || 600) - 100;
        const minY = marshTop + 15;
        const maxY = marshBottom - 20;

        if (this.y < minY) {
            this.y = minY;
            if (this.body.velocity.y < 0) this.body.setVelocityY(0);
        } else if (this.y > maxY) {
            this.y = maxY;
            if (this.body.velocity.y > 0) this.body.setVelocityY(0);
        }

        const waterX = this.getWaterXAtCat();
        const safeWaterX = waterX + 45;
        if (this.x < safeWaterX) {
            this.x = safeWaterX;
            if (this.state === 'chase' || this.state === 'attack' || this.state === 'cooldown') {
                this.endChase();
            }
            this.setFlipX(false);
            this.body.setVelocityX(Math.max(this.patrolSpeed, this.body.velocity.x));
        }

        if (this.shadow && this.body) {
            const worldW = this.body.width * Math.abs(this.scaleX);
            const worldH = this.body.height * Math.abs(this.scaleY);
            this.shadow.setPosition(this.x, this.y + worldH / 2 + 4);
            this.shadow.setScale(worldW / 128, (worldW / 128) * 0.35);
        }

        this.animationTimer += delta;
        if (this.animationTimer >= this.animationSpeed) {
            this.animationTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.walkingFrames.length;

            if (this.state === 'patrol' || this.state === 'chase') {
                const frameSrc = this.walkingFrames[this.currentFrame];
                if (typeof frameSrc === 'number') {
                    this.setFrame(frameSrc);
                } else {
                    this.setTexture(frameSrc);
                }
            }
        }

        switch (this.state) {
            case 'patrol':
                this.patrol(delta);
                this.searchForPrey(rails);
                break;
            case 'chase':
                this.chase(delta);
                break;
            case 'attack':
                this.attack(delta);
                break;
            case 'cooldown':
                this.cooldown(delta);
                break;
        }
    }

    patrol(_delta) {
        const waterX = this.getWaterXAtCat();
        const safeWaterX = waterX + 45;

        const currentPatrolMinX = Math.max(this.initialPatrolMinX, safeWaterX);
        const maxMarshX = (this.scene.scale?.width || 1000) - 80;
        const currentPatrolMaxX = Math.max(
            this.initialPatrolMaxX,
            Math.min(maxMarshX, currentPatrolMinX + this.patrolSpan)
        );

        if (this.x >= currentPatrolMaxX) {
            this.body.setVelocityX(-this.patrolSpeed);
            this.setFlipX(true);
        } else if (this.x <= currentPatrolMinX) {
            this.body.setVelocityX(this.patrolSpeed);
            this.setFlipX(false);
        }

        const distY = this.homeY - this.y;
        if (Math.abs(distY) > 12) {
            this.body.setVelocityY(Phaser.Math.Clamp(distY * 0.8, -40, 40));
        } else {
            this.body.setVelocityY(0);
        }
    }

    searchForPrey(rails) {
        if (!rails || !rails.children) return;

        const waterX = this.getWaterXAtCat();

        const detectedRail = rails.children.entries.find(rail => {
            if (!rail.isAlive || !rail.isDetectable) return false;
            if (rail.x < waterX + 30) return false;
            return this.canSeeRail(rail);
        });

        if (detectedRail) {
            this.startChase(detectedRail);
        }
    }

    canSeeRail(rail) {
        const distance = Phaser.Math.Distance.Between(this.x, this.y, rail.x, rail.y);
        if (distance > this.visionRange) return false;

        // Check if in vision cone (simplified - just distance for now)
        const facingRight = !this.flipX;
        const railIsRight = rail.x > this.x;

        // Must be in the direction we're facing
        if (facingRight && !railIsRight) return false;
        if (!facingRight && railIsRight) return false;

        return true;
    }

    startChase(rail) {
        this.state = 'chase';
        this.target = rail;

        // Switch to pouncing/running pose for chase
        this.setFrame(5);

        // Trigger panic on the Rail - shows surprised sprite with exclamation
        if (rail.panic) {
            rail.panic();
        }

        this.scene.tweens.add({
            targets: this,
            scaleX: this.alertScale,
            scaleY: this.alertScale,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                this.setScale(this.chaseScale);
            }
        });
    }

    chase(_delta) {
        if (!this.target || !this.target.isAlive) {
            this.endChase();
            return;
        }

        if (!this.target.isDetectable) {
            this.endChase();
            return;
        }

        const waterX = this.getWaterXAtCat();
        const safeWaterX = waterX + 45;

        if (this.target.x < waterX + 30 || this.x < safeWaterX) {
            this.endChase();
            return;
        }

        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
        this.body.setVelocity(
            Math.cos(angle) * this.chaseSpeed,
            Math.sin(angle) * this.chaseSpeed
        );

        this.setFlipX(this.target.x < this.x);

        const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        if (distance < 30) {
            this.catchPrey();
            return;
        }

        if (distance > 300) {
            this.endChase();
        }
    }

    catchPrey() {
        this.state = 'attack';
        this.body.setVelocity(0, 0);

        this.setFrame(7);

        if (this.target && this.target.isAlive) {
            this.target.die('predator');
            this.scene.events.emit('railCaught', this.target);
        }

        this.scene.tweens.add({
            targets: this,
            scaleX: this.attackScaleX,
            scaleY: this.attackScaleY,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                this.setScale(this.baseScale);
                this.startCooldown();
            }
        });
    }

    attack(_delta) {
    }

    endChase() {
        this.state = 'patrol';
        this.target = null;
        this.setFrame(0);
        this.setScale(this.baseScale);

        const waterX = this.getWaterXAtCat();
        if (this.x < waterX + 65) {
            this.setFlipX(false);
            this.body.setVelocityX(this.patrolSpeed);
        } else {
            this.body.setVelocityX(this.patrolSpeed * (this.flipX ? -1 : 1));
        }
        this.body.setVelocityY(0);
    }

    startCooldown() {
        this.state = 'cooldown';
        this.cooldownTimer = 2000;
        this.target = null;
    }

    cooldown(delta) {
        const waterX = this.getWaterXAtCat();
        if (this.x < waterX + 45) {
            this.endChase();
            return;
        }

        this.cooldownTimer -= delta;
        if (this.cooldownTimer <= 0) {
            this.endChase();
        }
    }
}

export class Cat extends GroundPredator {
    constructor(scene, x, y, patrolMinX, patrolMaxX) {
        super(scene, x, y, patrolMinX, patrolMaxX, 'cat_sheet');

        this.baseScale = CAT_BASE_SCALE;
        this.chaseScale = CAT_CHASE_SCALE;
        this.alertScale = CAT_ALERT_SCALE;
        this.attackScaleX = CAT_ATTACK_SCALE_X;
        this.attackScaleY = CAT_ATTACK_SCALE_Y;

        this.setScale(this.baseScale);
        this.body.setSize(200, 200);
        this.body.setOffset(150, 200);

        this.walkingFrames = [0, 1, 2, 3, 4, 5, 6];
        this.currentFrame = 0;

        this.patrolSpeed = 120;
        this.chaseSpeed = 320;
        this.visionRange = 120;
        this.animationSpeed = 80;

        this.body.setVelocityX(this.patrolSpeed);
    }

    startChase(rail) {
        this.state = 'chase';
        this.target = rail;

        this.setFrame(2);

        if (rail.panic) {
            rail.panic();
        }

        this.scene.tweens.add({
            targets: this,
            scaleX: this.alertScale,
            scaleY: this.alertScale,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                this.setScale(this.chaseScale);
            }
        });
    }

    catchPrey() {
        this.state = 'attack';
        this.body.setVelocity(0, 0);

        this.setFrame(12);

        if (this.target && this.target.isAlive) {
            this.target.die('predator');
            this.scene.events.emit('railCaught', this.target);
        }

        this.scene.tweens.add({
            targets: this,
            scaleX: this.attackScaleX,
            scaleY: this.attackScaleY,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                this.setScale(this.baseScale);
                this.startCooldown();
            }
        });
    }
}
