import * as Phaser from 'phaser';

const FOX_BASE_SCALE = 0.32;
const FOX_CHASE_SCALE = 0.35;
const FOX_ALERT_SCALE = 0.37;
const FOX_ATTACK_SCALE_X = 0.38;
const FOX_ATTACK_SCALE_Y = 0.30;

export class Fox extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'fox_sheet', 0);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.baseScale = FOX_BASE_SCALE;
        this.chaseScale = FOX_CHASE_SCALE;
        this.alertScale = FOX_ALERT_SCALE;
        this.attackScaleX = FOX_ATTACK_SCALE_X;
        this.attackScaleY = FOX_ATTACK_SCALE_Y;

        this.setScale(this.baseScale);
        this.setDepth(4);

        this.body.setSize(220, 100);
        this.body.setOffset(115, 110);

        this.patrolSpeed = 115;
        this.chaseSpeed = 295;
        this.visionRange = 145;

        this.patrolDirX = Math.random() < 0.5 ? -1 : 1;
        this.patrolDirY = Math.random() < 0.5 ? -1 : 1;
        this.headingAngle = 0.65;
        this.wanderTimer = 0;
        this.nextWanderInterval = 3000;

        this.state = 'patrol';
        this.target = null;
        this.cooldownTimer = 0;

        this.trottingFrames = [0, 1, 2, 3];
        this.currentFrame = 0;
        this.animationTimer = 0;
        this.animationSpeed = 90;

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
            if (this.state === 'chase' || this.state === 'attack' || this.state === 'cooldown') {
                this.endChase();
            } else if (this.state === 'patrol') {
                this.applyDiagonalVelocity();
            }
        } else if (this.x >= maxMarshX && this.patrolDirX > 0) {
            this.x = maxMarshX;
            this.patrolDirX = -1;
            if (this.state === 'chase' || this.state === 'attack' || this.state === 'cooldown') {
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

        this.animationTimer += delta;
        if (this.animationTimer >= this.animationSpeed) {
            this.animationTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.trottingFrames.length;

            if (this.state === 'patrol') {
                this.setFrame(this.trottingFrames[this.currentFrame]);
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

        this.setFrame(4);

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
        if (distance < 32) {
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

        this.setFrame(5);

        if (this.target && this.target.isAlive) {
            this.target.die('predator');
            this.scene.events.emit('railCaught', this.target);
        }

        if (this.scene && this.scene.tweens) {
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
        } else {
            this.startCooldown();
        }
    }

    attack(_delta) {
    }

    endChase() {
        this.state = 'patrol';
        this.target = null;
        this.setFrame(0);
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
        this.cooldownTimer = 1800;
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
