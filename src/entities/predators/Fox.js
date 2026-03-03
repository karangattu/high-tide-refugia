import * as Phaser from 'phaser';

export class Fox extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, patrolMinX, patrolMaxX) {
        // Start with walking pose 1 (frame 0)
        super(scene, x, y, 'fox_sheet', 0);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Scale down the sprites (they're large images)
        this.setScale(0.20); // slightly smaller to compensate for the padding in 860x960

        // Physics properties - adjust for scaled sprite
        this.body.setSize(500, 250);
        this.body.setOffset(200, 450);

        // Patrol boundaries
        this.patrolMinX = patrolMinX;
        this.patrolMaxX = patrolMaxX;
        this.patrolSpeed = 90;
        this.chaseSpeed = 280;

        // State
        this.state = 'patrol'; // patrol, chase, attack, cooldown
        this.target = null;
        this.cooldownTimer = 0;
        this.visionRange = 150;
        this.visionAngle = Math.PI / 3; // 60 degree cone

        // Animation state
        this.animationTimer = 0;
        this.currentFrame = 0;
        this.walkingFrames = [0, 1, 2, 3];
        this.animationSpeed = 80; // ms per frame (faster for smoother look)

        // Start patrol
        this.body.setVelocityX(this.patrolSpeed);
        this.setFlipX(false);
    }

    update(time, delta, rails) {
        // Animate walking/running
        this.animationTimer += delta;
        if (this.animationTimer >= this.animationSpeed) {
            this.animationTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.walkingFrames.length;

            // Update texture based on state
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

    patrol(delta) {
        // Get current water level to adjust patrol boundary
        const waterX = this.scene.waterSystem ? this.scene.waterSystem.getWaterX() : 0;
        const currentPatrolMinX = Math.max(this.patrolMinX, waterX + 40);

        // Bounce at patrol boundaries
        if (this.x >= this.patrolMaxX) {
            this.body.setVelocityX(-this.patrolSpeed);
            this.setFlipX(true);
        } else if (this.x <= currentPatrolMinX) {
            this.body.setVelocityX(this.patrolSpeed);
            this.setFlipX(false);
        }
    }

    searchForPrey(rails) {
        if (!rails || !rails.children) return;

        const detectedRail = rails.children.entries.find(rail => {
            if (!rail.isAlive || !rail.isDetectable) return false;
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
        if (typeof this.walkingFrames[0] === 'number') {
            this.setFrame(5);
        } else {
            this.setTexture('fox_pouncing');
        }

        // Trigger panic on the Rail - shows surprised sprite with exclamation
        if (rail.panic) {
            rail.panic();
        }

        // Alert animation on predator
        this.scene.tweens.add({
            targets: this,
            scaleX: 0.28,
            scaleY: 0.28,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                this.setScale(0.25);
            }
        });

        // Exclamation effect on predator
        const exclaim = this.scene.add.text(this.x, this.y - 40, '!', {
            fontFamily: 'Outfit',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ff0000',
        }).setOrigin(0.5);

        this.scene.tweens.add({
            targets: exclaim,
            y: exclaim.y - 20,
            alpha: 0,
            duration: 500,
            onComplete: () => exclaim.destroy(),
        });
    }

    chase(delta) {
        if (!this.target || !this.target.isAlive) {
            this.endChase();
            return;
        }

        // If target became safe (entered plant), give up
        if (!this.target.isDetectable) {
            this.endChase();
            return;
        }

        // Move towards target
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
        this.body.setVelocity(
            Math.cos(angle) * this.chaseSpeed,
            Math.sin(angle) * this.chaseSpeed
        );

        this.setFlipX(this.target.x < this.x);

        // Prevent entering water during chase
        const waterX = this.scene.waterSystem ? this.scene.waterSystem.getWaterX() : 0;
        if (this.x < waterX + 30) {
            this.endChase();
            return;
        }

        // Check if caught
        const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        if (distance < 30) {
            this.catchPrey();
        }

        // Give up if too far
        if (distance > 300) {
            this.endChase();
        }
    }

    catchPrey() {
        this.state = 'attack';
        this.body.setVelocity(0, 0);

        // Switch to standing with kill pose
        if (typeof this.walkingFrames[0] === 'number') {
            this.setFrame(7);
        } else {
            this.setTexture('fox_with_kill');
        }

        if (this.target && this.target.isAlive) {
            this.target.die('predator');

            // Emit event for scoring
            this.scene.events.emit('railCaught', this.target);
        }

        // Attack animation - brief pause then cooldown
        this.scene.tweens.add({
            targets: this,
            scaleX: 0.28,
            scaleY: 0.22,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                this.setScale(0.25);
                this.startCooldown();
            }
        });
    }

    attack(delta) {
        // Attack state is brief and handled by tween in catchPrey
        // Just wait for tween to complete and transition to cooldown
    }

    endChase() {
        this.state = 'patrol';
        this.target = null;
        // Return to walking animation
        if (typeof this.walkingFrames[0] === 'number') {
            this.setFrame(0);
        } else {
            this.setTexture('fox_walking_1');
        }
        this.body.setVelocityX(this.patrolSpeed * (this.flipX ? -1 : 1));
        this.body.setVelocityY(0);
    }

    startCooldown() {
        this.state = 'cooldown';
        this.cooldownTimer = 2000;
        this.target = null;
        // Stay on standing with kill pose during cooldown
    }

    cooldown(delta) {
        this.cooldownTimer -= delta;
        if (this.cooldownTimer <= 0) {
            this.endChase();
        }
    }
}

export class Cat extends Fox {
    constructor(scene, x, y, patrolMinX, patrolMaxX) {
        super(scene, x, y, patrolMinX, patrolMaxX);

        this.setTexture('cat_sheet');
        this.setFrame(0);

        this.setScale(0.18); // Scaled down more since the 500x507 frames are large
        this.body.setSize(200, 200);
        // Center the body horizontally, push down vertically for the feet
        this.body.setOffset(150, 200);

        // Smooth jumping/bounding walk cycle (top row)
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

        // Use pouncing/takeoff frame
        this.setFrame(2);

        // Trigger panic on the Rail
        if (rail.panic) {
            rail.panic();
        }

        // Alert animation on predator
        this.scene.tweens.add({
            targets: this,
            scaleX: 0.22,
            scaleY: 0.22,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                this.setScale(0.18);
            }
        });

        // Exclamation effect
        const exclaim = this.scene.add.text(this.x, this.y - 30, '!', {
            fontFamily: 'Outfit',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ff0000',
        }).setOrigin(0.5);

        this.scene.tweens.add({
            targets: exclaim,
            y: exclaim.y - 20,
            alpha: 0,
            duration: 500,
            onComplete: () => exclaim.destroy(),
        });
    }

    catchPrey() {
        this.state = 'attack';
        this.body.setVelocity(0, 0);

        // Use standing with kill frame (frame 12)
        this.setFrame(12);

        if (this.target && this.target.isAlive) {
            this.target.die('predator');
            this.scene.events.emit('railCaught', this.target);
        }

        // Attack animation
        this.scene.tweens.add({
            targets: this,
            scaleX: 0.22,
            scaleY: 0.18,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                this.setScale(0.18);
                this.startCooldown();
            }
        });
    }

    endChase() {
        this.state = 'patrol';
        this.target = null;
        this.setFrame(0);
        this.body.setVelocityX(this.patrolSpeed * (this.flipX ? -1 : 1));
        this.body.setVelocityY(0);
    }
}
