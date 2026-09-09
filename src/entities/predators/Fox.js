import * as Phaser from 'phaser';
import { getEntityScaleFactor } from '../../utils/mobile.js';

const FOX_BASE_SCALE = 0.36;
const FOX_CHASE_SCALE = 0.39;
const FOX_ALERT_SCALE = 0.41;
const FOX_RUN_TEXTURES = [
    'fox_run_1', 'fox_run_2', 'fox_run_3', 'fox_run_4',
    'fox_run_5', 'fox_run_6', 'fox_run_7',
];
const FOX_POUNCE_TEXTURES = [
    'fox_pounce_1', 'fox_pounce_2', 'fox_pounce_3', 'fox_pounce_4',
    'fox_pounce_5', 'fox_pounce_6', 'fox_pounce_7', 'fox_pounce_8',
];
const POUNCE_CONTACT_FRAME = 2;

export class Fox extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, FOX_RUN_TEXTURES[0]);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        const entityScale = getEntityScaleFactor(scene?.scale?.width, scene?.scale?.height);
        this.entityScale = entityScale;
        this.baseScale = FOX_BASE_SCALE * entityScale;
        this.chaseScale = FOX_CHASE_SCALE * entityScale;
        this.alertScale = FOX_ALERT_SCALE * entityScale;

        this.setScale(this.baseScale);
        this.setDepth(4);

        this.body.setSize(220, 100);
        this.body.setOffset(115, 110);

        this.patrolSpeed = 115;
        this.chaseSpeed = 295;
        this.visionRange = 145;
        this.catchDistance = 32 * entityScale;

        this.patrolDirX = Math.random() < 0.5 ? -1 : 1;
        this.patrolDirY = Math.random() < 0.5 ? -1 : 1;
        this.headingAngle = 0.65;
        this.wanderTimer = 0;
        this.nextWanderInterval = 3000;

        this.state = 'patrol';
        this.target = null;
        this.cooldownTimer = 0;

        this.runningFrames = FOX_RUN_TEXTURES;
        this.pounceFrames = FOX_POUNCE_TEXTURES;
        this.currentRunFrame = 0;
        this.currentPounceFrame = 0;
        this.animationTimer = 0;
        this.runAnimationSpeed = 90;
        this.pounceAnimationSpeed = 110;
        this.pounceResolved = false;

        this.shadow = scene.add.image(x, y, 'shadow')
            .setAlpha(0.28)
            .setDepth(-1);

        this.once('destroy', () => {
            if (this.shadow) this.shadow.destroy();
            this.shadow = null;
        });

        this.applyDiagonalVelocity();
    }

    getWaterXAtFox() {
        if (!this.scene || !this.scene.waterSystem) return 0;
        return this.scene.waterSystem.getWaterX(this.y);
    }

    applyDiagonalVelocity() {
        if (!this.body) return;
        const vx = this.patrolDirX * Math.cos(this.headingAngle) * this.patrolSpeed;
        const vy = this.patrolDirY * Math.sin(this.headingAngle) * this.patrolSpeed;
        this.body.setVelocity(vx, vy);
        this.setFlipX(vx < 0);
    }

    update(time, delta, rails) {
        if (!this.scene || !this.body) return;

        const marshTop = this.scene.marshTop !== undefined ? this.scene.marshTop : 100;
        const marshBottom = this.scene.marshBottom !== undefined ? this.scene.marshBottom : (this.scene.scale?.height || 600) - 100;
        const minY = marshTop + 15;
        const maxY = marshBottom - 15;

        const waterX = this.getWaterXAtFox();
        const safeWaterX = waterX + 45;
        const maxMarshX = (this.scene.scale?.width || 1000) - 100;

        if (this.y <= minY && this.patrolDirY < 0) {
            this.y = minY;
            this.patrolDirY = 1;
            if (this.state === 'patrol') this.applyDiagonalVelocity();
        } else if (this.y >= maxY && this.patrolDirY > 0) {
            this.y = maxY;
            this.patrolDirY = -1;
            if (this.state === 'patrol') this.applyDiagonalVelocity();
        }

        if (this.x <= safeWaterX && this.patrolDirX < 0) {
            this.x = safeWaterX;
            this.patrolDirX = 1;
            if (this.state === 'chase' || this.state === 'cooldown') {
                this.endChase();
            } else if (this.state === 'patrol') {
                this.applyDiagonalVelocity();
            }
        } else if (this.x >= maxMarshX && this.patrolDirX > 0) {
            this.x = maxMarshX;
            this.patrolDirX = -1;
            if (this.state === 'chase' || this.state === 'cooldown') {
                this.endChase();
            } else if (this.state === 'patrol') {
                this.applyDiagonalVelocity();
            }
        }

        if (this.shadow && this.body) {
            const worldW = this.body.width * Math.abs(this.scaleX);
            const worldH = this.body.height * Math.abs(this.scaleY);
            this.shadow.setPosition(this.x, this.y + worldH / 2 + 2);
            this.shadow.setScale(worldW / 128, (worldW / 128) * 0.32);
        }

        if (this.state === 'patrol' || this.state === 'chase') {
            this.animateRun(delta);
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

    animateRun(delta) {
        this.animationTimer += delta;
        const frameDuration = this.state === 'chase'
            ? this.runAnimationSpeed * 0.78
            : this.runAnimationSpeed;

        if (this.animationTimer >= frameDuration) {
            this.animationTimer %= frameDuration;
            this.currentRunFrame = (this.currentRunFrame + 1) % this.runningFrames.length;
            this.setTexture(this.runningFrames[this.currentRunFrame]);
        }
    }

    patrol(delta) {
        this.wanderTimer += delta;
        if (this.wanderTimer >= this.nextWanderInterval) {
            this.wanderTimer = 0;
            this.nextWanderInterval = 2600 + Math.random() * 1800;
            this.headingAngle = 0.44 + Math.random() * 0.52;
            this.applyDiagonalVelocity();
        }
    }

    searchForPrey(rails) {
        if (!rails || !rails.children) return;

        const waterX = this.getWaterXAtFox();

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

        const facingRight = !this.flipX;
        const railIsRight = rail.x > this.x;

        if (facingRight && !railIsRight) return false;
        if (!facingRight && railIsRight) return false;

        return true;
    }

    startChase(rail) {
        this.state = 'chase';
        this.target = rail;
        this.animationTimer = 0;

        if (rail.panic) {
            rail.panic();
        }

        if (this.scene && this.scene.tweens) {
            this.scene.tweens.add({
                targets: this,
                scaleX: this.alertScale,
                scaleY: this.alertScale,
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    if (this.state === 'chase') {
                        this.setScale(this.chaseScale);
                    }
                }
            });
        }
    }

    chase(_delta) {
        if (!this.target || !this.target.isAlive || !this.target.isDetectable) {
            this.endChase();
            return;
        }

        const waterX = this.getWaterXAtFox();
        const safeWaterX = waterX + 45;
        const maxMarshX = (this.scene.scale?.width || 1000) - 100;

        if (this.target.x < waterX + 30 || this.x < safeWaterX || this.x > maxMarshX) {
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
        if (distance < this.catchDistance) {
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
        this.setScale(this.baseScale);
        this.currentPounceFrame = 0;
        this.animationTimer = 0;
        this.pounceResolved = false;
        this.setTexture(this.pounceFrames[0]);

        // Hold the live rail in place until the artwork reaches the bite pose.
        // Later pounce frames contain the rail, so the standalone sprite is
        // hidden at contact to avoid showing two birds.
        if (this.target && this.target.body) {
            this.target.isBeingCaught = true;
            this.target.body.setVelocity(0, 0);
        }
    }

    attack(delta) {
        this.animationTimer += delta;
        if (this.animationTimer < this.pounceAnimationSpeed) return;

        this.animationTimer %= this.pounceAnimationSpeed;
        if (this.currentPounceFrame < this.pounceFrames.length - 1) {
            this.currentPounceFrame++;
            this.setTexture(this.pounceFrames[this.currentPounceFrame]);

            if (this.currentPounceFrame === POUNCE_CONTACT_FRAME) {
                this.resolvePounce();
            }
            return;
        }

        if (!this.pounceResolved) this.resolvePounce();
        this.startCooldown();
    }

    resolvePounce() {
        if (this.pounceResolved) return;
        this.pounceResolved = true;

        if (this.target && this.target.isAlive) {
            this.target.setVisible(false);
            this.target.die('predator');
            this.scene.events.emit('railCaught', this.target);
        }
    }

    endChase() {
        this.state = 'patrol';
        this.target = null;
        this.currentRunFrame = 0;
        this.animationTimer = 0;
        this.setTexture(this.runningFrames[0]);
        this.setScale(this.baseScale);

        const waterX = this.getWaterXAtFox();
        if (this.x < waterX + 65) {
            this.patrolDirX = 1;
        } else if (this.x > (this.scene.scale?.width || 1000) - 120) {
            this.patrolDirX = -1;
        }
        this.applyDiagonalVelocity();
    }

    startCooldown() {
        this.state = 'cooldown';
        this.cooldownTimer = 900;
        this.target = null;
    }

    cooldown(delta) {
        const waterX = this.getWaterXAtFox();
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
