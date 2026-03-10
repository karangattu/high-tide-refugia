import * as Phaser from 'phaser';

const HARRIER_BASE_SCALE = 0.22;

export class Harrier extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);

        scene.add.existing(this);

        this.baseScale = HARRIER_BASE_SCALE;

        // Shadow sprite (what we see on the ground)
        this.shadow = scene.add.sprite(0, 0, 'harrier_sheet', 0);
        this.shadow.setScale(this.baseScale);

        // Slightly transparent so we can see what's under it but not fully like a shadow
        this.shadow.setAlpha(0.9);
        this.add(this.shadow);

        // State
        this.state = 'glide'; // glide, dive, recovery
        this.speed = 100;
        this.diveSpeed = 400;
        this.target = null;
        this.diveTimer = 0;
        this.cooldownTimer = 0;

        // Glide pattern
        this.glideDirection = 1;
        this.verticalOffset = 0;
        this.glideTime = 0;

        // Animation state
        this.animationTimer = 0;
        this.currentFrame = 0;
        this.glidingFrames = [0, 1, 2, 4, 5, 6];
        this.animationSpeed = 100;

        // Scene bounds
        this.minX = 200;
        this.maxX = scene.scale.width - 100;
        this.minY = 100;
        this.maxY = scene.scale.height - 100;
    }

    update(time, delta, rails, plants) {
        // Animate based on state
        this.animationTimer += delta;
        if (this.animationTimer >= this.animationSpeed) {
            this.animationTimer = 0;

            if (this.state === 'glide' || this.state === 'recovery') {
                this.currentFrame = (this.currentFrame + 1) % this.glidingFrames.length;
                this.shadow.setFrame(this.glidingFrames[this.currentFrame]);
            }
        }

        switch (this.state) {
            case 'glide':
                this.glide(delta);
                this.searchForPrey(rails, plants);
                break;
            case 'dive':
                this.dive(delta);
                break;
            case 'recovery':
                this.recovery(delta);
                break;
        }
    }

    glide(delta) {
        this.glideTime += delta * 0.001;

        // Serpentine glide pattern
        this.x += this.speed * this.glideDirection * (delta / 1000);
        this.verticalOffset = Math.sin(this.glideTime * 2) * 50;
        this.y = 300 + this.verticalOffset;

        // Bounce at edges
        if (this.x >= this.maxX) {
            this.glideDirection = -1;
            this.shadow.setFlipX(true);
        } else if (this.x <= this.minX) {
            this.glideDirection = 1;
            this.shadow.setFlipX(false);
        }

        // Keep fixed scale
        this.shadow.setScale(this.baseScale);
    }

    searchForPrey(rails, plants) {
        if (!rails || !rails.children) return;

        const exposedRail = rails.children.entries.find(rail => {
            if (!rail.isAlive || !rail.isDetectable) return false;

            // Check if rail is under our current position
            const distance = Phaser.Math.Distance.Between(this.x, this.y, rail.x, rail.y);
            if (distance > 100) return false;

            // Check if rail is protected by a plant (roof coverage)
            if (plants && plants.children) {
                const isUnderPlant = plants.children.entries.some(plant => {
                    const plantDist = Phaser.Math.Distance.Between(plant.x, plant.y, rail.x, rail.y);
                    return plantDist < 40;
                });
                if (isUnderPlant) return false;
            }

            return true;
        });

        if (exposedRail) {
            this.startDive(exposedRail);
        }
    }

    startDive(rail) {
        this.state = 'dive';
        this.target = rail;
        this.diveTimer = 0;

        // Switch to diving silhouette (frame 10 - attacking with claws out)
        this.shadow.setFrame(10);

        // Make it face the target during dive
        if (this.target.x < this.x) {
            this.shadow.setFlipX(true);
        } else {
            this.shadow.setFlipX(false);
        }

        // Trigger panic on the Rail - shows surprised sprite with exclamation
        if (rail.panic) {
            rail.panic();
        }

        // Alert - shadow grows larger as it comes closer to the ground
        this.scene.tweens.add({
            targets: this.shadow,
            scaleX: this.baseScale * 1.5,
            scaleY: this.baseScale * 1.5,
            duration: 200,
        });

        // Warning indicator for player
        const warning = this.scene.add.circle(rail.x, rail.y, 40, 0xff0000, 0.3);
        this.scene.tweens.add({
            targets: warning,
            scale: 1.5,
            alpha: 0,
            duration: 500,
            onComplete: () => warning.destroy(),
        });
    }

    dive(delta) {
        this.diveTimer += delta;

        if (!this.target || !this.target.isAlive) {
            this.startRecovery();
            return;
        }

        // Quick movement toward target
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
        this.x += Math.cos(angle) * this.diveSpeed * (delta / 1000);
        this.y += Math.sin(angle) * this.diveSpeed * (delta / 1000);

        // Face the target
        this.shadow.setFlipX(this.target.x < this.x);

        // Check if caught
        const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        // If target became safe, abort
        if (!this.target.isDetectable) {
            this.startRecovery();
            return;
        }

        if (distance < 25) {
            this.catchPrey();
        }

        // Max dive time
        if (this.diveTimer > 1000) {
            this.startRecovery();
        }
    }

    catchPrey() {
        if (this.target && this.target.isAlive) {
            this.target.die('predator');
            this.scene.events.emit('railCaught', this.target);

            // Switch to standing with kill frame (frame 15 - catching rail on ground)
            this.shadow.setFrame(15);
        }

        // Impact effect
        const impact = this.scene.add.circle(this.x, this.y, 20, 0xffff00, 0.8);
        this.scene.tweens.add({
            targets: impact,
            scale: 3,
            alpha: 0,
            duration: 300,
            onComplete: () => impact.destroy(),
        });

        this.scene.cameras.main.shake(150, 0.01);

        this.startRecovery();
    }

    startRecovery() {
        this.state = 'recovery';
        this.cooldownTimer = 3000;
        this.target = null;

        // Shrink as harrier gains altitude
        this.scene.tweens.add({
            targets: this.shadow,
            scaleX: this.baseScale * 0.7,
            scaleY: this.baseScale * 0.7,
            duration: 500,
        });
    }

    recovery(delta) {
        this.cooldownTimer -= delta;

        // Slowly glide while recovering
        this.x += 30 * this.glideDirection * (delta / 1000);

        if (this.cooldownTimer <= 0) {
            this.state = 'glide';

            // Return to normal appearance
            this.scene.tweens.add({
                targets: this.shadow,
                scaleX: this.baseScale,
                scaleY: this.baseScale,
                duration: 300,
            });
        }
    }
}
