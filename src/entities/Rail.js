import * as Phaser from 'phaser';

const RAIL_BASE_SCALE = 0.18;
const RAIL_BOOST_SCALE = 0.22;
const RAIL_CELEBRATION_SCALE = 0.24;

export class Rail extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, speedMultiplier = 1) {
        // Start with running pose 1
        super(scene, x, y, 'rail_running_1');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.baseScale = RAIL_BASE_SCALE;

        // Scale down the sprites (they're large images)
        this.setScale(this.baseScale);

        // Physics properties - adjust for scaled sprite
        this.body.setSize(300, 250);
        this.body.setOffset(50, 100);
        this.setBounce(0.3);
        this.setCollideWorldBounds(true);

        // Rail state
        this.isSafe = false;        // Inside a plant (invisible to predators)
        this.isDetectable = true;   // Can be seen by predators
        this.isAlive = true;
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
        this.animationSpeed = 110; // ms per frame

        // Visual
        this.originalTint = 0xffffff;

        // Start moving right
        this.body.setVelocityX(this._speedX);
    }

    update(time, delta) {
        if (!this.isAlive) return;

        // Apply tweened horizontal speed
        this.body.setVelocityX(this._speedX);

        // Smooth sine-wave vertical bob (replaces erratic random snaps)
        const targetVY = Math.sin(time * this.wobbleFreq + this.wobbleOffset) * this.wobbleAmp;
        this.body.setVelocityY(targetVY);

        // Dynamic lean: tilt toward vertical velocity for a natural run feel
        const maxLean = 0.13; // ~7.5 degrees
        this.setRotation((targetVY / this.wobbleAmp) * maxLean);

        // Animate running frames
        this.animationTimer += delta;
        if (this.animationTimer >= this.animationSpeed) {
            this.animationTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.runningFrames.length;
            if (!this.isSafe) {
                this.setTexture(this.runningFrames[this.currentFrame]);
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
        if (!this.isSafe) {
            this.isSafe = true;
            this.isDetectable = false;

            // Fade to hiding texture
            this.scene.tweens.add({
                targets: this,
                alpha: 0.55,
                duration: 150,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    if (this.isSafe) this.setTexture('rail_hiding');
                }
            });

            // Brief slowdown inside cover
            this._tweenSpeed(this.baseSpeed * 0.3, 200);

            // Schedule speed boost after brief pause
            this.scene.time.delayedCall(300, () => {
                if (this.isAlive) {
                    this.giveSpeedBoost();
                }
            });
        }
    }

    exitPlant() {
        this.isSafe = false;
        this.isDetectable = true;

        // Snap back to running texture immediately, then fade in
        this.setTexture(this.runningFrames[this.currentFrame]);
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 150,
            ease: 'Sine.easeOut',
        });

        // Return toward base speed smoothly
        this._tweenSpeed(this.baseSpeed, 300);
    }

    giveSpeedBoost() {
        // Ease velocity up to boost speed
        this._tweenSpeed(this.baseSpeed * 1.5, 250);

        // Use racing pose during boost
        this.setTexture('rail_running_2');

        // Visual feedback — brief scale pulse
        this.scene.tweens.add({
            targets: this,
            scaleX: RAIL_BOOST_SCALE,
            scaleY: RAIL_BOOST_SCALE,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                this.setScale(this.baseScale);
            }
        });

        // Return to base speed after 1 second
        this.scene.time.delayedCall(1000, () => {
            if (this.isAlive && !this.isSafe) {
                this._tweenSpeed(this.baseSpeed, 400);
            }
        });
    }

    // Smoothly tween _speedX to a new value
    _tweenSpeed(targetSpeed, duration) {
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
        this.body.setVelocity(0, 0);

        // Switch to calling/celebrating pose
        this.setTexture('rail_calling');

        // Celebration animation
        this.scene.tweens.add({
            targets: this,
            y: this.y - 20,
            alpha: 0,
            scaleX: RAIL_CELEBRATION_SCALE,
            scaleY: RAIL_CELEBRATION_SCALE,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                this.destroy();
            }
        });

        // Emit heart particles
        if (this.scene.particleManager) {
            this.scene.particleManager.emitHearts(this.x, this.y);
        }

        // Return whether it was a perfect run
        return !this.touchedDirt;
    }

    // Called when a predator spots this Rail - shows warning before death
    panic() {
        if (!this.isAlive || this.isPanicking) return;

        this.isPanicking = true;
        this.setRotation(0);

        // Switch to surprised pose immediately
        this.setTexture('rail_surprised');

        // Stop moving briefly
        this.body.setVelocity(0, 0);

        // Create exclamation mark warning above Rail
        const exclaim = this.scene.add.text(this.x, this.y - 40, '!', {
            fontFamily: 'Outfit',
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#ffcc00',
            stroke: '#ff0000',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(100);

        // Animate exclamation mark
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

        // Brief shake effect on the Rail
        this.scene.tweens.add({
            targets: this,
            x: this.x + 3,
            duration: 50,
            yoyo: true,
            repeat: 3,
        });
    }

    die(cause = 'predator') {
        if (!this.isAlive) return;

        this.isAlive = false;
        this.isPanicking = false;
        this.setRotation(0);
        this.body.setVelocity(0, 0);

        // Switch to surprised pose
        this.setTexture('rail_surprised');

        // Death animation
        if (cause === 'water') {
            // Swept away by water
            this.scene.tweens.add({
                targets: this,
                x: this.x - 50,
                alpha: 0,
                rotation: Math.PI / 2,
                duration: 500,
                onComplete: () => this.destroy()
            });
        } else {
            // Caught by predator - shrink away
            this.scene.tweens.add({
                targets: this,
                scaleX: 0,
                scaleY: 0,
                alpha: 0,
                duration: 300,
                onComplete: () => this.destroy()
            });
        }

        // Screen shake
        this.scene.cameras.main.shake(100, 0.005);
    }

    isPerfectRun() {
        return !this.touchedDirt;
    }
}

