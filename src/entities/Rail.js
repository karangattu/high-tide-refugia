import Phaser from 'phaser';

export class Rail extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, speedMultiplier = 1) {
        // Start with running pose 1 (frame 0)
        super(scene, x, y, 'rail_sheet', 0);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Scale down the sprites (they're large images)
        this.setScale(0.07);

        // Physics properties - adjust for scaled sprite
        this.body.setSize(400, 300);
        this.body.setOffset(144, 280);
        this.setBounce(0.3);
        this.setCollideWorldBounds(true);

        // Rail state
        this.isSafe = false;        // Inside a plant (invisible to predators)
        this.isDetectable = true;   // Can be seen by predators
        this.isAlive = true;
        this.hasReachedSafety = false;
        this.touchedDirt = false;   // For continuous cover tracking
        this.speedBoostTimer = 0;

        // Base movement (scaled by level multiplier)
        this.baseSpeed = Phaser.Math.Between(80, 120) * speedMultiplier;
        this.currentSpeed = this.baseSpeed;
        this.erraticTimer = 0;
        this.erraticDirection = 0;

        // Animation state
        this.animationTimer = 0;
        this.currentFrame = 0;
        this.runningFrames = [0, 1, 2, 3];
        this.animationSpeed = 80;

        // Visual
        this.originalTint = 0xffffff;

        // Start moving right
        this.body.setVelocityX(this.baseSpeed);
    }

    update(time, delta) {
        if (!this.isAlive) return;

        // Animate running
        this.animationTimer += delta;
        if (this.animationTimer >= this.animationSpeed) {
            this.animationTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.runningFrames.length;

            // Switch texture based on state
            if (this.isSafe) {
                this.setFrame(4);
            } else if (!this.isPanicking) {
                this.setFrame(this.runningFrames[this.currentFrame]);
            }
        }

        if (!this.isPanicking && !this.hasReachedSafety) {
            this.body.setVelocityX(this.currentSpeed);
        }

        // Erratic movement - slight up/down wobble
        this.erraticTimer += delta;
        if (this.erraticTimer > 500) {
            this.erraticTimer = 0;
            this.erraticDirection = Phaser.Math.Between(-1, 1) * 30;
        }
        this.body.setVelocityY(this.erraticDirection);

        // Speed boost countdown
        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= delta;
            if (this.speedBoostTimer <= 0) {
                this.currentSpeed = this.baseSpeed;
                this.body.setVelocityX(this.currentSpeed);
            }
        }

        // Visual feedback for safety state
        if (this.isSafe) {
            this.setAlpha(0.6);
            this.isDetectable = false;
            this.setFrame(4);
        } else {
            this.setAlpha(1);
            this.isDetectable = true;
            this.touchedDirt = true; // Touched bare ground
        }
    }

    enterPlant() {
        if (!this.isSafe) {
            this.isSafe = true;
            this.isDetectable = false;

            // Switch to hiding pose
            this.setFrame(4);

            // Brief pause in plant
            this.currentSpeed = this.baseSpeed * 0.3;

            // Schedule speed boost
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
        this.setAlpha(1);
        // Return to running animation
        this.setFrame(0);
    }

    giveSpeedBoost() {
        this.currentSpeed = this.baseSpeed * 1.5;
        this.body.setVelocityX(this.currentSpeed);
        this.speedBoostTimer = 1000;

        // Use running frame for speed boost
        this.setFrame(5);

        // Visual feedback
        this.scene.tweens.add({
            targets: this,
            scaleX: 0.09,
            scaleY: 0.09,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                this.setScale(0.07);
            }
        });
    }

    reachSafety() {
        if (this.hasReachedSafety) return;

        this.hasReachedSafety = true;
        this.body.setVelocity(0, 0);

        // Switch to calling/celebrating pose
        this.setFrame(6);

        // Celebration animation
        this.scene.tweens.add({
            targets: this,
            y: this.y - 20,
            alpha: 0,
            scaleX: 0.10,
            scaleY: 0.10,
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
        if (!this.scene || !this.isAlive || this.isPanicking) return;

        this.isPanicking = true;

        // Switch to surprised pose immediately
        this.setFrame(5);

        // Stop moving briefly
        if (this.body) {
            this.body.setVelocity(0, 0);
        }

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
                if (this.isAlive) {
                    this.isPanicking = false;
                }
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
        if (!this.scene || !this.isAlive) return;

        this.isAlive = false;
        this.isPanicking = false;
        if (this.body) {
            this.body.setVelocity(0, 0);
        }

        // Switch to surprised pose
        this.setFrame(5);

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

