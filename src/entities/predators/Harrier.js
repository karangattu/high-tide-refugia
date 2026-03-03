import * as Phaser from 'phaser';

export class Harrier extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);

        scene.add.existing(this);

        // Shadow sprite (what we see on the ground)
        this.shadow = scene.add.sprite(0, 0, 'harrier');
        this.shadow.setAlpha(0.6);
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

        // Scene bounds
        this.minX = 200;
        this.maxX = scene.scale.width - 100;
        this.minY = 100;
        this.maxY = scene.scale.height - 100;
    }

    update(time, delta, rails, plants) {
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

        // Subtle scale pulse to show altitude
        const pulse = 0.9 + Math.sin(this.glideTime * 3) * 0.1;
        this.shadow.setScale(pulse);
    }

    searchForPrey(rails, plants) {
        if (!rails || !rails.children) return;

        const exposedRail = rails.children.entries.find(rail => {
            if (!rail.isAlive || !rail.isDetectable) return false;

            // Check if rail is under our current position
            const distance = Phaser.Math.Distance.Between(this.x, this.y, rail.x, rail.y);
            if (distance > 80) return false;

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

        // Switch to diving silhouette
        this.shadow.setTexture('harrier_dive');

        // Trigger panic on the Rail - shows surprised sprite with exclamation
        if (rail.panic) {
            rail.panic();
        }

        // Alert - shadow grows larger and darker
        this.scene.tweens.add({
            targets: this.shadow,
            scaleX: 1.8,
            scaleY: 1.8,
            alpha: 0.9,
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

        // Switch back to glide silhouette and shrink as harrier gains altitude
        this.shadow.setTexture('harrier');
        this.scene.tweens.add({
            targets: this.shadow,
            scaleX: 0.6,
            scaleY: 0.6,
            alpha: 0.3,
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
                scaleX: 1,
                scaleY: 1,
                alpha: 0.6,
                duration: 300,
            });
        }
    }
}
