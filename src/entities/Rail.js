import * as Phaser from 'phaser';
import { getEntityScaleFactor } from '../utils/mobile.js';

const RAIL_BASE_SCALE = 0.11;
const RAIL_BOOST_SCALE = 0.13;
const RAIL_CELEBRATION_SCALE = 0.145;

export class Rail extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, speedMultiplier = 1) {
        super(scene, x, y, 'rail_running_1');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        const entityScale = getEntityScaleFactor(scene?.scale?.width, scene?.scale?.height);
        this.entityScale = entityScale;
        this.baseScale = RAIL_BASE_SCALE * entityScale;
        this.boostScale = RAIL_BOOST_SCALE * entityScale;
        this.celebrationScale = RAIL_CELEBRATION_SCALE * entityScale;
        this.setScale(this.baseScale);
        this.setDepth(3);

        // Physics properties - adjust for scaled sprite
        this.body.setSize(520, 380);
        this.body.setOffset(170, 230);
        this.setBounce(0.3);
        this.setCollideWorldBounds(true);

        // Rail state
        this.isSafe = false;        // Inside a plant (invisible to predators)
        this.isDetectable = true;   // Can be seen by predators
        this.isAlive = true;
        this.isBeingCaught = false;
        this.hasReachedSafety = false;
        this.touchedDirt = false;   // For continuous cover tracking

        // Base movement (scaled by level multiplier)
        this.baseSpeed = Phaser.Math.Between(80, 120) * speedMultiplier;
        // _speedX is the tweened target — update() applies it each frame
        this._speedX = this.baseSpeed;

        // Smooth vertical bob via a per-rail sine wave
        this.wobbleFreq = Phaser.Math.FloatBetween(0.0025, 0.004);
        this.wobbleOffset = Phaser.Math.FloatBetween(0, Math.PI * 2);
        this.wobbleAmp = Phaser.Math.Between(20, 35);

        // Animation state
        this.animationTimer = 0;
        this.currentFrame = 0;
        this.runningFrames = ['rail_running_1', 'rail_running_2', 'rail_running_3', 'rail_running_4'];
        this.sprintFrames = ['rail_sprint_1', 'rail_sprint_2', 'rail_sprint_3', 'rail_sprint_4'];
        this.animationSpeed = 110; // ms per frame
        this.isBoosting = false;

        // Visual
        this.originalTint = 0xffffff;

        this.boostTimer = null;
        this.boostResetTimer = null;

        // Ground contact shadow (positioned dynamically in update())
        this.shadow = scene.add.image(x, y, 'shadow')
            .setAlpha(0.35)
            .setDepth(-1);
        this.once('destroy', () => {
            if (this.shadow) this.shadow.destroy();
            this.shadow = null;
            if (this.boostTimer) {
                this.boostTimer.remove();
                this.boostTimer = null;
            }
            if (this.boostResetTimer) {
                this.boostResetTimer.remove();
                this.boostResetTimer = null;
            }
            if (this.scene && this.scene.tweens) {
                this.scene.tweens.killTweensOf(this);
            }
            this.isAlive = false;
        });

        // Start moving right
        this.body.setVelocityX(this._speedX);
    }

    update(time, delta) {
        if (!this.isAlive) return;
        if (this.isBeingCaught) {
            this.body.setVelocity(0, 0);
            return;
        }

        // Glue the contact shadow to the body's feet (tracks boost pulses)
        if (this.shadow && this.body) {
            const worldW = this.body.width * Math.abs(this.scaleX);
            const worldH = this.body.height * Math.abs(this.scaleY);
            this.shadow.setPosition(this.x, this.y + worldH / 2 + 4);
            this.shadow.setScale(worldW / 128, (worldW / 128) * 0.35);
        }

        // Apply tweened horizontal speed
        this.body.setVelocityX(this._speedX);

        let targetVY = Math.sin(time * this.wobbleFreq + this.wobbleOffset) * this.wobbleAmp;
        if (this.scene.marshBottom && this.y > this.scene.marshBottom && targetVY > 0) {
            targetVY = -Math.abs(targetVY);
        } else if (this.scene.marshTop && this.y < this.scene.marshTop && targetVY < 0) {
            targetVY = Math.abs(targetVY);
        }
        this.body.setVelocityY(targetVY);

        // Dynamic lean: tilt toward vertical velocity for a natural run feel
        const maxLean = 0.13; // ~7.5 degrees
        this.setRotation((targetVY / this.wobbleAmp) * maxLean);

        // Animate running frames (gallop cycle while boosting)
        this.animationTimer += delta;
        if (this.animationTimer >= this.animationSpeed) {
            this.animationTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.runningFrames.length;
            if (!this.isSafe && !this.isPanicking) {
                const frames = this.isBoosting ? this.sprintFrames : this.runningFrames;
                this.setTexture(frames[this.currentFrame]);
            }
        }

        // Visual feedback for safety state (alpha transitions handled in enterPlant/exitPlant)
        if (this.isSafe) {
            this.isDetectable = false;
        } else {
            this.isDetectable = true;
            this.touchedDirt = true;
        }
    }

    enterPlant() {
        if (!this.scene || !this.isAlive || this.isSafe) return;
        this.isSafe = true;
        this.isDetectable = false;

        if (this.scene.tweens) {
            this.scene.tweens.add({
                targets: this,
                alpha: 0.55,
                duration: 150,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    if (this.scene && this.isSafe) this.setTexture('rail_hiding');
                }
            });
        }

        this._tweenSpeed(this.baseSpeed * 0.3, 200);

        if (this.boostTimer) {
            this.boostTimer.remove();
            this.boostTimer = null;
        }
        if (this.scene.time) {
            this.boostTimer = this.scene.time.delayedCall(300, () => {
                if (this.scene && this.isAlive) {
                    this.giveSpeedBoost();
                }
            });
        }
    }

    exitPlant() {
        if (!this.scene || !this.isAlive) return;
        this.isSafe = false;
        this.isDetectable = true;

        this.setTexture(this.runningFrames[this.currentFrame]);
        if (this.scene.tweens) {
            this.scene.tweens.add({
                targets: this,
                alpha: 1,
                duration: 150,
                ease: 'Sine.easeOut',
            });
        }

        this._tweenSpeed(this.baseSpeed, 300);
    }

    giveSpeedBoost() {
        if (!this.scene || !this.isAlive) return;
        this._tweenSpeed(this.baseSpeed * 1.5, 250);

        this.isBoosting = true;
        if (!this.isSafe && !this.isPanicking) {
            this.setTexture(this.sprintFrames[this.currentFrame]);
        }

        if (this.scene.tweens) {
            this.scene.tweens.add({
                targets: this,
                scaleX: this.boostScale,
                scaleY: this.boostScale,
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    if (this.scene) this.setScale(this.baseScale);
                }
            });
        }

        if (this.boostResetTimer) {
            this.boostResetTimer.remove();
            this.boostResetTimer = null;
        }
        if (this.scene.time) {
            this.boostResetTimer = this.scene.time.delayedCall(1000, () => {
                this.isBoosting = false;
                if (this.scene && this.isAlive && !this.isSafe) {
                    this._tweenSpeed(this.baseSpeed, 400);
                }
            });
        }
    }

    _tweenSpeed(targetSpeed, duration) {
        if (!this.scene || !this.scene.tweens || !this.isAlive) return;
        this.scene.tweens.add({
            targets: this,
            _speedX: targetSpeed,
            duration,
            ease: 'Sine.easeOut',
        });
    }

    reachSafety() {
        if (this.hasReachedSafety) return;

        this.hasReachedSafety = true;
        this.isAlive = false;
        if (this.boostTimer) {
            this.boostTimer.remove();
            this.boostTimer = null;
        }
        if (this.boostResetTimer) {
            this.boostResetTimer.remove();
            this.boostResetTimer = null;
        }
        if (this.body) this.body.setVelocity(0, 0);

        this.setTexture('rail_calling');

        if (this.scene && this.scene.tweens) {
            this.scene.tweens.add({
                targets: this,
                y: this.y - 20,
                alpha: 0,
                scaleX: this.celebrationScale,
                scaleY: this.celebrationScale,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    this.destroy();
                }
            });
        } else {
            this.destroy();
        }

        if (this.scene && this.scene.particleManager) {
            this.scene.particleManager.emitHearts(this.x, this.y);
        }

        return !this.touchedDirt;
    }

    panic() {
        if (!this.isAlive || this.isPanicking || !this.scene) return;

        this.isPanicking = true;
        this.setRotation(0);
        this.setTexture('rail_surprised');
        if (this.body) this.body.setVelocity(0, 0);

        if (this.scene.add) {
            const exclaim = this.scene.add.text(this.x, this.y - 40, '!', {
                fontFamily: 'Mona Sans',
                fontSize: '32px',
                fontStyle: 'bold',
                color: '#ffcc00',
                stroke: '#ff0000',
                strokeThickness: 4,
            }).setOrigin(0.5).setDepth(100);

            if (this.scene.tweens) {
                this.scene.tweens.add({
                    targets: exclaim,
                    y: exclaim.y - 15,
                    scaleX: 1.3,
                    scaleY: 1.3,
                    duration: 200,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        exclaim.destroy();
                    }
                });
                this.scene.tweens.add({
                    targets: this,
                    x: this.x + 3,
                    duration: 50,
                    yoyo: true,
                    repeat: 3,
                });
            }
        }
    }

    die(cause = 'predator') {
        if (!this.isAlive) return;

        this.isAlive = false;
        this.isPanicking = false;
        if (this.boostTimer) {
            this.boostTimer.remove();
            this.boostTimer = null;
        }
        if (this.boostResetTimer) {
            this.boostResetTimer.remove();
            this.boostResetTimer = null;
        }
        this.setRotation(0);
        if (this.body) this.body.setVelocity(0, 0);

        this.setTexture('rail_surprised');

        if (this.scene && this.scene.tweens) {
            this.scene.tweens.killTweensOf(this);
            if (cause === 'water') {
                this.scene.tweens.add({
                    targets: this,
                    x: this.x - 50,
                    alpha: 0,
                    rotation: Math.PI / 2,
                    duration: 500,
                    onComplete: () => this.destroy()
                });
            } else {
                this.scene.tweens.add({
                    targets: this,
                    alpha: 0,
                    duration: 120,
                    onComplete: () => this.destroy()
                });
            }
        } else {
            this.destroy();
        }

        if (this.scene && this.scene.cameras && this.scene.cameras.main) {
            this.scene.cameras.main.shake(100, 0.005);
        }
    }

    isPerfectRun() {
        return !this.touchedDirt;
    }
}
