import * as Phaser from 'phaser';

const HARRIER_BASE_SCALE = 0.4;
// Cruising altitude (px above the ground point) and cruise size.
// Smaller + higher reads as altitude; the ground shadow marks the hunt zone.
const CRUISE_ALTITUDE = 150;
const SEARCH_RADIUS = 100;

export class Harrier extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);

        scene.add.existing(this);
        this.setDepth(6);

        this.baseScale = HARRIER_BASE_SCALE;
        this.cruiseScale = HARRIER_BASE_SCALE * 0.8;
        this.diveScale = HARRIER_BASE_SCALE * 1.3;

        // Ground hunt-shadow: dark ellipse + faint search-radius ring.
        // This sits on the marsh and tells the player where the harrier
        // is looking; the bird itself flies high above it.
        this.huntRing = scene.add.circle(0, 0, SEARCH_RADIUS, 0xff6b6b, 0.05);
        this.huntRing.setStrokeStyle(1.5, 0xff6b6b, 0.28);
        this.add(this.huntRing);

        this.groundShadow = scene.add.ellipse(0, 0, 90, 26, 0x000000, 0.32);
        this.add(this.groundShadow);

        // The bird, offset upward to read as altitude
        this.bird = scene.add.sprite(0, -CRUISE_ALTITUDE, 'harrier_glide_1');
        this.bird.setScale(this.cruiseScale);
        this.bird.setAlpha(0.95);
        this.add(this.bird);

        // State
        this.state = 'glide'; // glide, dive, recovery
        this.speed = 100;
        this.diveSpeed = 480;
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
        this.glidingFrames = [
            'harrier_glide_1', 'harrier_glide_2', 'harrier_glide_3',
            'harrier_glide_4', 'harrier_glide_5', 'harrier_glide_6',
        ];
        this.animationSpeed = 100;

        // Scene bounds (ground track; GameScene narrows these to the marsh)
        this.minX = 200;
        this.maxX = scene.scale.width - 100;
        this.minY = 100;
        this.maxY = scene.scale.height - 100;
        this.midY = (this.minY + this.maxY) / 2;
    }

    update(time, delta, rails, plants) {
        // Animate based on state
        this.animationTimer += delta;
        if (this.animationTimer >= this.animationSpeed) {
            this.animationTimer = 0;

            if (this.state === 'glide' || this.state === 'recovery') {
                this.currentFrame = (this.currentFrame + 1) % this.glidingFrames.length;
                this.bird.setTexture(this.glidingFrames[this.currentFrame]);
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

        // Serpentine ground track around the marsh midline
        this.x += this.speed * this.glideDirection * (delta / 1000);
        this.verticalOffset = Math.sin(this.glideTime * 2) * 50;
        this.midY = (this.minY + this.maxY) / 2;
        this.y = Phaser.Math.Clamp(this.midY + this.verticalOffset, this.minY, this.maxY);

        // Gentle bob at altitude; shadow breathes on the ground below
        this.bird.y = -CRUISE_ALTITUDE + Math.sin(this.glideTime * 3) * 8;
        this.groundShadow.alpha = 0.28 + Math.sin(this.glideTime * 3) * 0.05;

        // Bounce at edges
        if (this.x >= this.maxX) {
            this.glideDirection = -1;
            this.bird.setFlipX(true);
        } else if (this.x <= this.minX) {
            this.glideDirection = 1;
            this.bird.setFlipX(false);
        }

        // Hold cruise size
        this.bird.setScale(this.cruiseScale);
    }

    searchForPrey(rails, plants) {
        if (!rails || !rails.children) return;

        const exposedRail = rails.children.entries.find(rail => {
            if (!rail.isAlive || !rail.isDetectable) return false;

            // The hunt shadow marks the search zone: rails under it are seen
            const distance = Phaser.Math.Distance.Between(this.x, this.y, rail.x, rail.y);
            if (distance > SEARCH_RADIUS) return false;

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

        // Stoop: the bird drops from the sky onto the ground point
        this.bird.setTexture('harrier_dive');
        this.scene.tweens.killTweensOf(this.bird);
        this.scene.tweens.add({
            targets: this.bird,
            y: 0,
            scaleX: this.diveScale,
            scaleY: this.diveScale,
            duration: 280,
            ease: 'Quad.easeIn',
        });
        // Hunt ring flares as the strike lands
        this.scene.tweens.add({
            targets: this.huntRing,
            alpha: 0.3,
            duration: 280,
        });

        // Make it face the target during dive
        if (this.target.x < this.x) {
            this.bird.setFlipX(true);
        } else {
            this.bird.setFlipX(false);
        }

        // Trigger panic on the Rail - shows surprised sprite with exclamation
        if (rail.panic) {
            rail.panic();
        }

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

        // Quick movement toward target (ground track chases the rail)
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
        this.x += Math.cos(angle) * this.diveSpeed * (delta / 1000);
        this.y += Math.sin(angle) * this.diveSpeed * (delta / 1000);

        // Face the target
        this.bird.setFlipX(this.target.x < this.x);

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

            // Switch to kill pose (carrying prey)
            this.bird.setTexture('harrier_kill');
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

        // Climb back to cruising altitude and shrink with distance
        this.scene.tweens.killTweensOf(this.bird);
        this.scene.tweens.killTweensOf(this.huntRing);
        this.scene.tweens.add({
            targets: this.bird,
            y: -CRUISE_ALTITUDE,
            scaleX: this.cruiseScale,
            scaleY: this.cruiseScale,
            duration: 900,
            ease: 'Sine.easeOut',
        });
        this.scene.tweens.add({
            targets: this.huntRing,
            alpha: 0.05,
            duration: 900,
        });
    }

    recovery(delta) {
        this.cooldownTimer -= delta;

        // Slowly glide while recovering
        this.x += 30 * this.glideDirection * (delta / 1000);

        if (this.cooldownTimer <= 0) {
            this.state = 'glide';
        }
    }
}
