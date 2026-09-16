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
        this.state = 'glide'; // glide, telegraph, dive, recovery
        this.speed = 100;
        this.diveSpeed = 480;
        this.target = null;
        this.diveTimer = 0;
        this.cooldownTimer = 0;

        // Tutorial harriers only demonstrate their shadow: they never strike.
        this.harmless = false;
        // Reticle warning before the strike, so dives can be reacted to.
        this.diveDelay = 420;
        this.telegraphRing = null;

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

        this.once('destroy', () => this.clearTelegraph());
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
            case 'telegraph':
                this.telegraph(delta);
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

        const waterX = this.scene?.waterSystem ? this.scene.waterSystem.getWaterX(this.y) : 0;
        const effectiveMinX = Math.max(this.minX, waterX + 45);

        if (this.x >= this.maxX) {
            this.glideDirection = -1;
            this.bird.setFlipX(true);
        } else if (this.x <= effectiveMinX) {
            this.glideDirection = 1;
            this.bird.setFlipX(false);
        }

        this.bird.setScale(this.cruiseScale);
    }

    isRailInCover(rail, plants) {
        if (!rail) return false;
        if (plants && plants.children) {
            for (const plant of plants.children.entries) {
                if (!plant || plant.isCover === undefined) continue;
                if (plant.isCover && !plant.isCover()) continue;
                const coverRadius = plant.getCoverRadius ? plant.getCoverRadius() : 40;
                const dx = rail.x - plant.x;
                if (Math.abs(dx) >= coverRadius) continue;
                const dy = rail.y - plant.y;
                if (Math.abs(dy) >= coverRadius) continue;
                if (dx * dx + dy * dy < coverRadius * coverRadius) {
                    return true;
                }
            }
        }
        const wrack = this.scene?.wrack;
        if (wrack && wrack.children) {
            for (const mat of wrack.children.entries) {
                if (!mat || mat.isCover === undefined) continue;
                if (mat.isCover && !mat.isCover()) continue;
                const coverRadius = mat.getCoverRadius ? mat.getCoverRadius() : 48;
                const dx = rail.x - mat.x;
                if (Math.abs(dx) >= coverRadius) continue;
                const dy = rail.y - mat.y;
                if (Math.abs(dy) >= coverRadius) continue;
                if (dx * dx + dy * dy < coverRadius * coverRadius) {
                    return true;
                }
            }
        }
        return false;
    }

    searchForPrey(rails, plants) {
        if (this.harmless) return;
        if (!rails || !rails.children) return;

        const safeZoneX = this.scene?.safeZoneX ?? ((this.scene?.scale?.width || 1000) - 100);

        const exposedRail = rails.children.entries.find(rail => {
            if (!rail.isAlive || !rail.isDetectable || rail.isBeingCaught || rail.hasReachedSafety) return false;
            if (rail.x >= safeZoneX) return false;

            const dx = rail.x - this.x;
            if (Math.abs(dx) > this.searchRadius) return false;
            const dy = rail.y - this.y;
            if (Math.abs(dy) > this.searchRadius) return false;
            if (dx * dx + dy * dy > this.searchRadius * this.searchRadius) return false;

            if (this.isRailInCover(rail, plants)) return false;

            return true;
        });

        if (exposedRail) {
            this.startDive(exposedRail);
        }
    }

    startDive(rail) {
        if (this.state === 'telegraph' || this.state === 'dive') return;
        this.state = 'telegraph';
        this.target = rail;
        this.telegraphTimer = this.diveDelay;

        if (this.scene && this.scene.add) {
            this.telegraphRing = this.scene.add.circle(rail.x, rail.y, 8)
                .setStrokeStyle(3, 0xff6b6b, 0.9)
                .setDepth(7);
            this.scene.tweens.add({
                targets: this.telegraphRing,
                radius: this.searchRadius,
                alpha: 0.1,
                duration: this.diveDelay,
            });
        }

        if (rail.panic) rail.panic();
    }

    telegraph(delta) {
        this.telegraphTimer -= delta;
        if (this.telegraphRing && this.target && this.target.isAlive) {
            this.telegraphRing.x = this.target.x;
            this.telegraphRing.y = this.target.y;
        }
        if (this.telegraphTimer > 0) return;

        const rail = this.target;
        const safeZoneX = this.scene?.safeZoneX ?? ((this.scene?.scale?.width || 1000) - 100);
        const canStrike = rail && rail.isAlive && rail.isDetectable && !rail.hasReachedSafety && !rail.isBeingCaught
            && rail.x < safeZoneX && !this.isRailInCover(rail, this.scene?.plants);
        this.clearTelegraph();
        if (!canStrike) {
            if (rail && rail.isAlive && (this.isRailInCover(rail, this.scene?.plants) || !rail.isDetectable || rail.hasReachedSafety)) {
                this.scene?.scoreManager?.recordNarrowEscape?.(rail, this);
            }
            this.missPrey();
            return;
        }
        this.beginDive(rail);
    }

    clearTelegraph() {
        if (this.telegraphRing) {
            this.scene?.tweens?.killTweensOf(this.telegraphRing);
            this.telegraphRing.destroy();
            this.telegraphRing = null;
        }
    }

    beginDive(rail) {
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
            const safeZoneX = this.scene?.safeZoneX ?? ((this.scene?.scale?.width || 1000) - 100);
            const canCatch = this.target && this.target.isAlive && this.target.isDetectable
                && !this.target.hasReachedSafety && !this.target.isBeingCaught
                && this.target.x < safeZoneX && !this.isRailInCover(this.target, this.scene?.plants);
            if (canCatch) {
                this.catchPrey();
            } else {
                if (this.target && this.target.isAlive && (this.isRailInCover(this.target, this.scene?.plants) || !this.target.isDetectable || this.target.hasReachedSafety)) {
                    this.scene?.scoreManager?.recordNarrowEscape?.(this.target, this);
                }
                this.missPrey();
            }
        }
    }

    catchPrey() {
        this.clearTelegraph();
        this.state = 'catch';
        if (this.target && this.target.isAlive) {
            this.target.isBeingCaught = true;
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

        if (this.x >= this.maxX) {
            this.glideDirection = -1;
            this.bird.setFlipX(true);
        } else if (this.x <= this.minX) {
            this.glideDirection = 1;
            this.bird.setFlipX(false);
        }

        if (this.carryTimer <= 0) {
            this.startRecovery();
        }
    }

    missPrey() {
        this.clearTelegraph();
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

        const waterX = this.scene?.waterSystem ? this.scene.waterSystem.getWaterX(this.y) : 0;
        const effectiveMinX = Math.max(this.minX, waterX + 45);

        if (this.x >= this.maxX) {
            this.glideDirection = -1;
            this.bird.setFlipX(true);
        } else if (this.x <= effectiveMinX) {
            this.glideDirection = 1;
            this.bird.setFlipX(false);
        }

        if (this.cooldownTimer <= 0) {
            this.state = 'glide';
        }
    }
}
