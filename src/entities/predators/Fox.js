import Phaser from 'phaser';

export class Fox extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, patrolMinX, patrolMaxX) {
        // Start with walking pose 1
        super(scene, x, y, 'fox_walking_1');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Scale down the sprites (they're large images)
        this.setScale(0.25);

        // Physics properties - adjust for scaled sprite
        this.body.setSize(450, 200);
        this.body.setOffset(75, 100);

        // Patrol boundaries
        this.patrolMinX = patrolMinX;
        this.patrolMaxX = patrolMaxX;
        this.patrolSpeed = 60;
        this.chaseSpeed = 200;

        // State
        this.state = 'patrol'; // patrol, chase, attack, cooldown
        this.target = null;
        this.cooldownTimer = 0;
        this.visionRange = 150;
        this.visionAngle = Math.PI / 3; // 60 degree cone

        // Animation state
        this.animationTimer = 0;
        this.currentFrame = 0;
        this.walkingFrames = ['fox_walking_1', 'fox_walking_2', 'fox_walking_3', 'fox_walking_4'];
        this.animationSpeed = 150; // ms per frame

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
                this.setTexture(this.walkingFrames[this.currentFrame]);
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
        this.setTexture('fox_pouncing');

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
        this.setTexture('fox_with_kill');

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
        this.setTexture('fox_walking_1');
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

        // Use detailed cat sprites
        this.setTexture('cat_walking_1');
        this.setScale(1.8);
        this.body.setSize(28, 18);
        this.body.setOffset(14, 10);

        // Cat-specific walking frames
        this.walkingFrames = ['cat_walking_1', 'cat_walking_2', 'cat_walking_3', 'cat_walking_4'];
        this.currentFrame = 0;

        // Cat is faster but smaller vision
        this.patrolSpeed = 80;
        this.chaseSpeed = 250;
        this.visionRange = 120;
        this.animationSpeed = 120; // slightly faster animation

        this.body.setVelocityX(this.patrolSpeed);
    }

    startChase(rail) {
        this.state = 'chase';
        this.target = rail;

        // Use cat-specific pouncing sprite
        this.setTexture('cat_pouncing');

        // Trigger panic on the Rail
        if (rail.panic) {
            rail.panic();
        }

        // Alert animation on predator
        this.scene.tweens.add({
            targets: this,
            scaleX: 2.0,
            scaleY: 2.0,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                this.setScale(1.8);
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

        // Use cat-specific kill sprite
        this.setTexture('cat_with_kill');

        if (this.target && this.target.isAlive) {
            this.target.die('predator');
            this.scene.events.emit('railCaught', this.target);
        }

        // Attack animation
        this.scene.tweens.add({
            targets: this,
            scaleX: 2.0,
            scaleY: 1.6,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                this.setScale(1.8);
                this.startCooldown();
            }
        });
    }

    endChase() {
        this.state = 'patrol';
        this.target = null;
        this.setTexture('cat_walking_1');
        this.body.setVelocityX(this.patrolSpeed * (this.flipX ? -1 : 1));
        this.body.setVelocityY(0);
    }
}
