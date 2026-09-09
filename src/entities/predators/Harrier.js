import * as Phaser from 'phaser';
import { getEntityScaleFactor } from '../../utils/mobile.js';

const HARRIER_BASE_SCALE = 0.46;
// Cruising altitude (px above the ground point) and cruise size.
// Smaller + higher reads as altitude; the ground shadow marks the hunt zone.
const CRUISE_ALTITUDE = 150;
const SEARCH_RADIUS = 100;

export class Harrier extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);

        scene.add.existing(this);
        this.setDepth(8);

        const entityScale = getEntityScaleFactor(scene?.scale?.width, scene?.scale?.height);
        this.entityScale = entityScale;
        this.baseScale = HARRIER_BASE_SCALE * entityScale;
        this.cruiseScale = HARRIER_BASE_SCALE * 0.82 * entityScale;
        this.diveScale = HARRIER_BASE_SCALE * 1.45 * entityScale;
        this.cruiseAltitude = CRUISE_ALTITUDE * entityScale;
        this.searchRadius = SEARCH_RADIUS * entityScale;

        // Ground hunt-shadow: dark ellipse + faint search-radius ring.
        // This sits on the marsh and tells the player where the harrier
        // is looking; the bird itself flies high above it.
        this.huntRing = scene.add.circle(0, 0, this.searchRadius, 0xff6b6b, 0.05);
        this.huntRing.setStrokeStyle(1.5, 0xff6b6b, 0.28);
        this.add(this.huntRing);

        this.groundShadow = scene.add.ellipse(0, 0, 90 * entityScale, 26 * entityScale, 0x000000, 0.32);
        this.add(this.groundShadow);

        // The bird, offset upward to read as altitude
        this.bird = scene.add.sprite(0, -this.cruiseAltitude, 'harrier_glide_1');
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
            case 'catch':
                break;
            case 'carry':
                this.carry(delta);
                break;
            case 'recovery':
                this.recovery(delta);
                break;
        }
    }

    glide(delta) {
        this.glideTime += delta * 0.001;

        this.x += this.speed * this.glideDirection * (delta / 1000);
        this.verticalOffset = Math.sin(this.glideTime * 2) * 50;
        this.midY = (this.minY + this.maxY) / 2;
        this.y = Phaser.Math.Clamp(this.midY + this.verticalOffset, this.minY, this.maxY);

        this.bird.y = -this.cruiseAltitude + Math.sin(this.glideTime * 3) * 8;
        this.groundShadow.alpha = 0.28 + Math.sin(this.glideTime * 3) * 0.05;

        if (this.x >= this.maxX) {
            this.glideDirection = -1;
            this.bird.setFlipX(true);
        } else if (this.x <= this.minX) {
            this.glideDirection = 1;
            this.bird.setFlipX(false);
        }

        this.bird.setScale(this.cruiseScale);
    }

    searchForPrey(rails, plants) {
        if (!rails || !rails.children) return;

        const exposedRail = rails.children.entries.find(rail => {
            if (!rail.isAlive || !rail.isDetectable) return false;

            const distance = Phaser.Math.Distance.Between(this.x, this.y, rail.x, rail.y);
            if (distance > this.searchRadius) return false;

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
        this.diveStartX = this.x;
        this.diveStartY = this.y;
        this.diveTargetX = rail.x;
        this.diveTargetY = rail.y;
        this.diveProgress = 0;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, rail.x, rail.y);
        this.diveDuration = Phaser.Math.Clamp((distance / this.diveSpeed) * 1000, 350, 650);

        this.bird.setFlipX(rail.x < this.x);
        this.glideDirection = rail.x < this.x ? -1 : 1;

        this.bird.setTexture('harrier_dive');
        this.scene.tweens.killTweensOf(this.bird);
        this.scene.tweens.killTweensOf(this.huntRing);

        this.scene.tweens.add({
            targets: this.huntRing,
            alpha: 0.35,
            duration: this.diveDuration,
        });

        if (rail.panic) {
            rail.panic();
        }
    }

    dive(delta) {
        this.diveProgress += delta / this.diveDuration;
        const progress = Math.min(1, this.diveProgress);
        const easeT = Phaser.Math.Easing.Quadratic.In(progress);

        if (this.target && this.target.isAlive) {
            this.diveTargetX = this.target.x;
            this.diveTargetY = this.target.y;
        }

        this.x = Phaser.Math.Linear(this.diveStartX, this.diveTargetX, easeT);
        this.y = Phaser.Math.Linear(this.diveStartY, this.diveTargetY, easeT);

        this.bird.y = Phaser.Math.Linear(-this.cruiseAltitude, 0, easeT);
        const currentScale = Phaser.Math.Linear(this.cruiseScale, this.diveScale, easeT);
        this.bird.setScale(currentScale);

        if (progress >= 1) {
            if (this.target && this.target.isAlive && this.target.isDetectable) {
                this.catchPrey();
            } else {
                this.missPrey();
            }
        }
    }

    catchPrey() {
        this.state = 'catch';
        if (this.target && this.target.isAlive) {
            this.target.die('predator');
            if (this.scene && this.scene.events) {
                this.scene.events.emit('railCaught', this.target);
            }
        }

        this.bird.setTexture('harrier_catch');
        this.bird.setScale(this.diveScale);
        this.bird.y = 0;

        if (this.scene && this.scene.particleManager) {
            this.scene.particleManager.emitDirt(this.x, this.y);
        }
        if (this.scene && this.scene.cameras && this.scene.cameras.main) {
            this.scene.cameras.main.shake(120, 0.006);
        }

        if (this.scene && this.scene.time) {
            this.scene.time.delayedCall(220, () => {
                if (this.active && this.scene) {
                    this.startCarry();
                }
            });
        }
    }

    startCarry() {
        if (!this.scene || !this.scene.tweens) return;
        this.state = 'carry';
        this.carryTimer = 2200;
        this.target = null;
        this.bird.setTexture('harrier_kill');

        this.scene.tweens.killTweensOf(this.bird);
        this.scene.tweens.killTweensOf(this.huntRing);

        this.scene.tweens.add({
            targets: this.bird,
            y: -this.cruiseAltitude,
            scaleX: this.cruiseScale * 1.1,
            scaleY: this.cruiseScale * 1.1,
            duration: 1000,
            ease: 'Sine.easeOut',
        });
        this.scene.tweens.add({
            targets: this.huntRing,
            alpha: 0.05,
            duration: 1000,
        });
    }

    carry(delta) {
        this.carryTimer -= delta;
        this.x += 120 * this.glideDirection * (delta / 1000);

        if (this.carryTimer <= 0) {
            this.startRecovery();
        }
    }

    missPrey() {
        this.target = null;
        if (this.scene && this.scene.particleManager) {
            this.scene.particleManager.emitDirt(this.x, this.y);
        }
        this.startRecovery();
    }

    startRecovery() {
        if (!this.scene || !this.scene.tweens) return;
        this.state = 'recovery';
        this.cooldownTimer = 2200;
        this.target = null;

        this.scene.tweens.killTweensOf(this.bird);
        this.scene.tweens.killTweensOf(this.huntRing);
        this.scene.tweens.add({
            targets: this.bird,
            y: -this.cruiseAltitude,
            scaleX: this.cruiseScale,
            scaleY: this.cruiseScale,
            duration: 800,
            ease: 'Sine.easeOut',
        });
        this.scene.tweens.add({
            targets: this.huntRing,
            alpha: 0.05,
            duration: 800,
        });
    }

    recovery(delta) {
        this.cooldownTimer -= delta;
        this.x += 60 * this.glideDirection * (delta / 1000);

        if (this.x >= this.maxX) {
            this.glideDirection = -1;
            this.bird.setFlipX(true);
        } else if (this.x <= this.minX) {
            this.glideDirection = 1;
            this.bird.setFlipX(false);
        }

        if (this.cooldownTimer <= 0) {
            this.state = 'glide';
        }
    }
}
