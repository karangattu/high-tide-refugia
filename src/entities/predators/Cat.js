import * as Phaser from 'phaser';
import { getEntityScaleFactor } from '../../utils/mobile.js';

const CAT_BASE_SCALE = 0.235;
const CAT_CHASE_SCALE = 0.26;
const CAT_ALERT_SCALE = 0.285;
const CAT_ATTACK_SCALE_X = 0.29;
const CAT_ATTACK_SCALE_Y = 0.24;

class GroundPredator extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, patrolMinX, patrolMaxX, texture) {
        super(scene, x, y, texture, 0);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        const entityScale = getEntityScaleFactor(scene?.scale?.width, scene?.scale?.height);
        this.entityScale = entityScale;
        this.baseScale = CAT_BASE_SCALE * entityScale;
        this.chaseScale = CAT_CHASE_SCALE * entityScale;
        this.alertScale = CAT_ALERT_SCALE * entityScale;
        this.attackScaleX = CAT_ATTACK_SCALE_X * entityScale;
        this.attackScaleY = CAT_ATTACK_SCALE_Y * entityScale;
        // Floor the catch radius so lanes right against the marsh clamp
        // (up to 20px away) stay reachable on small mobile scales.
        this.catchDistance = Math.max(30, 36 * entityScale);

        // Smooth steering + stuck detection for chase
        this.steerRate = 11;
        this.chaseStuckTimer = 0;
        this.lastChaseDistance = Infinity;
        // Hard cap on a single pursuit so a cat never trails a rail forever
        // (e.g. a rail camped in cover at the edge of the catch radius).
        this.chaseTimer = 0;
        this.chaseTimeout = 3500;

        this.setScale(this.baseScale);
        this.setDepth(4);

        this.body.setSize(200, 200);
        this.body.setOffset(150, 200);

        this.initialPatrolMinX = patrolMinX;
        this.initialPatrolMaxX = patrolMaxX;
        this.patrolMinX = patrolMinX;
        this.patrolMaxX = patrolMaxX;
        this.patrolSpan = Math.max(100, patrolMaxX - patrolMinX);
        this.homeY = y;
        this.patrolSpeed = 90;
        this.chaseSpeed = 280;

        this.state = 'patrol';
        this.target = null;
        this.cooldownTimer = 0;
        this.visionRange = 150;
        this.visionAngle = Math.PI / 3;

        // Terrain response (pickleweed mats) and player diversion lures
        this.terrainFactor = 1;
        this.lureX = 0;
        this.lureY = 0;
        this.lureUntil = 0;

        this.animationTimer = 0;
        this.currentFrame = 0;
        this.walkingFrames = [0, 1, 2, 3];
        this.animationSpeed = 80;

        this.body.setVelocityX(this.patrolSpeed);
        this.setFlipX(false);

        this.shadow = scene.add.image(x, y, 'shadow')
            .setAlpha(0.3)
            .setDepth(-1);
        this.once('destroy', () => {
            if (this.shadow) this.shadow.destroy();
            this.shadow = null;
        });
    }

    getWaterXAtCat() {
        if (!this.scene || !this.scene.waterSystem) return 0;
        return this.scene.waterSystem.getWaterX(this.y);
    }

    update(time, delta, rails) {
        if (!this.scene || !this.body) return;

        const marshTop = this.scene.marshTop !== undefined ? this.scene.marshTop : 100;
        const marshBottom = this.scene.marshBottom !== undefined ? this.scene.marshBottom : (this.scene.scale?.height || 600) - 100;
        const minY = marshTop + 15;
        const maxY = marshBottom - 20;

        if (this.y < minY) {
            this.y = minY;
            if (this.body.velocity.y < 0) this.body.setVelocityY(0);
        } else if (this.y > maxY) {
            this.y = maxY;
            if (this.body.velocity.y > 0) this.body.setVelocityY(0);
        }

        const waterX = this.getWaterXAtCat();
        const safeWaterX = waterX + 45;
        if (this.x < safeWaterX) {
            this.x = safeWaterX;
            if (this.state === 'chase' || this.state === 'attack' || this.state === 'cooldown') {
                this.endChase();
            }
            this.setFlipX(false);
            this.body.setVelocityX(Math.max(this.patrolSpeed, this.body.velocity.x));
        }

        if (this.shadow && this.body) {
            const worldW = this.body.width * Math.abs(this.scaleX);
            const worldH = this.body.height * Math.abs(this.scaleY);
            this.shadow.setPosition(this.x, this.y + worldH / 2 + 4);
            this.shadow.setScale(worldW / 128, (worldW / 128) * 0.35);
        }

        this.animationTimer += delta;
        if (this.animationTimer >= this.animationSpeed) {
            this.animationTimer %= this.animationSpeed;
            this.currentFrame = (this.currentFrame + 1) % this.walkingFrames.length;

            if (this.state === 'patrol' || this.state === 'chase') {
                const frameSrc = this.walkingFrames[this.currentFrame];
                if (typeof frameSrc === 'number') {
                    this.setFrame(frameSrc);
                } else {
                    this.setTexture(frameSrc);
                }
            }
        }

        // Dense pickleweed tangles slow ground predators as they cross it.
        this.terrainFactor = this.getTerrainSlowFactor();

        // A player rustle or a Saltie sighting can pull the predator off the
        // rail route for a moment — but never mid-pounce.
        if (this.state !== 'attack' && this.lureUntil && time < this.lureUntil) {
            this.handleLure(delta);
            return;
        }
        if (time >= this.lureUntil) this.lureUntil = 0;

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

    steer(desiredVX, desiredVY, delta) {
        const dt = Math.min(delta || 16, 50) / 1000;
        const t = 1 - Math.exp(-this.steerRate * dt);
        this.body.velocity.x = Phaser.Math.Linear(this.body.velocity.x, desiredVX, t);
        this.body.velocity.y = Phaser.Math.Linear(this.body.velocity.y, desiredVY, t);
    }

    /** Speed multiplier from crossing pickleweed tangle mats (min over overlaps). */
    getTerrainSlowFactor() {
        const plants = this.scene?.plants;
        if (!plants || !plants.children) return 1;
        let factor = 1;
        for (const plant of plants.children.entries) {
            if (plant.plantType !== 'pickleweed') continue;
            if (plant.isCover && !plant.isCover()) continue;
            const radius = (plant.getCoverRadius ? plant.getCoverRadius() : 36) + 14;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, plant.x, plant.y);
            if (dist < radius) {
                const slow = plant.getGroundSlowFactor ? plant.getGroundSlowFactor() : 0.75;
                factor = Math.min(factor, slow);
            }
        }
        return factor;
    }

    /** Walk toward a diversion point instead of the state machine. */
    handleLure(delta) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.lureX, this.lureY);
        const speed = this.patrolSpeed * this.terrainFactor;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.lureX, this.lureY);
        if (dist < 24) {
            this.body.setVelocity(0, 0);
            return;
        }
        this.steer(Math.cos(angle) * speed, Math.sin(angle) * speed, delta);
        if (Math.abs(this.lureX - this.x) > 4) this.setFlipX(this.lureX < this.x);
    }

    /** Lure this predator toward (x, y) for `duration` ms. */
    distractAt(x, y, duration = 1500) {
        this.lureX = x;
        this.lureY = y;
        this.lureUntil = (this.scene?.time?.now ?? 0) + duration;
        // A committed pounce must finish; otherwise the rail would freeze.
        if (this.state === 'chase' || this.state === 'cooldown') {
            this.endChase();
        }
    }

    patrol(delta) {
        const waterX = this.getWaterXAtCat();
        const safeWaterX = waterX + 45;

        const currentPatrolMinX = Math.max(this.initialPatrolMinX, safeWaterX);
        const maxMarshX = (this.scene.scale?.width || 1000) - 80;
        const currentPatrolMaxX = Math.max(
            this.initialPatrolMaxX,
            Math.min(maxMarshX, currentPatrolMinX + this.patrolSpan)
        );

        let dir = this.body.velocity.x < 0 ? -1 : 1;
        if (this.x >= currentPatrolMaxX) {
            dir = -1;
            this.setFlipX(true);
        } else if (this.x <= currentPatrolMinX) {
            dir = 1;
            this.setFlipX(false);
        }

        const distY = this.homeY - this.y;
        const desiredVY = Math.abs(distY) > 12
            ? Phaser.Math.Clamp(distY * 0.8, -40, 40)
            : 0;

        this.steer(dir * this.patrolSpeed * this.terrainFactor, desiredVY, delta);
    }

    searchForPrey(rails) {
        if (!rails || !rails.children) return;

        const waterX = this.getWaterXAtCat();
        const safeWaterX = waterX + 45;

        const detectedRail = rails.children.entries.find(rail => {
            if (!rail.isAlive || !rail.isDetectable) return false;
            // Never lock onto a rail parked inside the water exclusion band,
            // where this predator is not allowed to follow.
            if (rail.x < safeWaterX) return false;
            // Skip rails already sheltered under a mature plant — the
            // isDetectable flag can lag a frame behind the overlap check.
            if (this.isRailInCover(rail)) return false;
            return this.canSeeRail(rail);
        });

        if (detectedRail) {
            this.startChase(detectedRail);
        }
    }

    canSeeRail(rail) {
        const distance = Phaser.Math.Distance.Between(this.x, this.y, rail.x, rail.y);
        if (distance > this.visionRange) return false;

        if (this.senseRadius && distance <= this.senseRadius) return true;

        const facingRight = !this.flipX;
        const railIsRight = rail.x > this.x;

        if (facingRight && !railIsRight) return false;
        if (!facingRight && railIsRight) return false;

        return true;
    }

    /**
     * Live cover check against mature plants, independent of the rail's
     * cached isDetectable flag (which updates a frame later via the scene's
     * overlap pass). Keeps predators from locking onto — or trailing —
     * rails that are already visually inside vegetation.
     */
    isRailInCover(rail) {
        const plants = this.scene?.plants;
        if (!plants || !plants.children || !rail) return false;
        for (const plant of plants.children.entries) {
            if (!plant || plant.isCover === undefined) continue;
            if (plant.isCover && !plant.isCover()) continue;
            const radius = plant.getCoverRadius ? plant.getCoverRadius() : 35;
            if (Phaser.Math.Distance.Between(rail.x, rail.y, plant.x, plant.y) < radius) {
                return true;
            }
        }
        return false;
    }

    startChase(rail) {
        this.state = 'chase';
        this.target = rail;
        this.chaseStuckTimer = 0;
        this.lastChaseDistance = Infinity;
        this.chaseTimer = 0;

        // Paw prints telegraph the charge before the predator closes in.
        this.scene.particleManager?.emitPawPrints?.(this.x, this.y, 4);

        // Switch to pouncing/running pose for chase
        this.setFrame(5);

        // Trigger panic on the Rail - shows surprised sprite with exclamation
        if (rail.panic) {
            rail.panic();
        }

        this.scene.tweens.add({
            targets: this,
            scaleX: this.alertScale,
            scaleY: this.alertScale,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                this.setScale(this.chaseScale);
            }
        });
    }

    chase(delta) {
        if (!this.target || !this.target.isAlive) {
            this.endChase();
            return;
        }

        if (!this.target.isDetectable) {
            this.endChase();
            return;
        }

        // The rail ducked into vegetation (flag or live overlap) — break off
        // instead of trailing it through the cover.
        if (this.target.isSafe || this.isRailInCover(this.target)) {
            this.endChase();
            return;
        }

        // Hard cap on pursuit time so a chase that never closes in ends
        // instead of looking like the cat "went crazy".
        this.chaseTimer += delta;
        if (this.chaseTimer > this.chaseTimeout) {
            this.endChase();
            return;
        }

        const waterX = this.getWaterXAtCat();
        const safeWaterX = waterX + 45;

        const marshTop = this.scene.marshTop !== undefined ? this.scene.marshTop : 100;
        const marshBottom = this.scene.marshBottom !== undefined ? this.scene.marshBottom : (this.scene.scale?.height || 600) - 100;
        const minY = marshTop + 15;
        const maxY = marshBottom - 20;

        if (this.target.x < safeWaterX || (this.x < safeWaterX && this.target.x <= this.x)) {
            this.endChase();
            return;
        }

        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
        this.steer(
            Math.cos(angle) * this.chaseSpeed * this.terrainFactor,
            Math.sin(angle) * this.chaseSpeed * this.terrainFactor,
            delta
        );

        if (Math.abs(this.target.x - this.x) > 4) {
            this.setFlipX(this.target.x < this.x);
        }

        const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        if (distance < this.catchDistance) {
            this.catchPrey();
            return;
        }

        if (distance > 300) {
            this.endChase();
            return;
        }

        // Give up if clamped against a boundary and no longer closing in,
        // so the cat never freezes beside an unreachable rail.
        const isClamped = (this.x <= safeWaterX + 4) || (this.y <= minY + 4) || (this.y >= maxY - 4);
        if (isClamped && distance >= this.lastChaseDistance - 0.5) {
            this.chaseStuckTimer += delta;
            if (this.chaseStuckTimer > 1500) {
                this.endChase();
                return;
            }
        } else {
            this.chaseStuckTimer = 0;
        }
        this.lastChaseDistance = distance;
    }

    catchPrey() {
        this.state = 'attack';
        this.body.setVelocity(0, 0);

        this.setFrame(7);

        if (this.target && this.target.isAlive) {
            this.target.die('predator');
            this.scene.events.emit('railCaught', this.target);
        }

        this.scene.tweens.add({
            targets: this,
            scaleX: this.attackScaleX,
            scaleY: this.attackScaleY,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                this.setScale(this.baseScale);
                this.startCooldown();
            }
        });
    }

    attack(_delta) {
    }

    endChase() {
        this.state = 'patrol';
        this.target = null;
        this.chaseStuckTimer = 0;
        this.lastChaseDistance = Infinity;
        this.chaseTimer = 0;
        this.setFrame(0);
        this.setScale(this.baseScale);

        const waterX = this.getWaterXAtCat();
        if (this.x < waterX + 65) {
            this.setFlipX(false);
            this.body.setVelocityX(this.patrolSpeed);
        } else {
            this.body.setVelocityX(this.patrolSpeed * (this.flipX ? -1 : 1));
        }
        this.body.setVelocityY(0);
    }

    startCooldown() {
        this.state = 'cooldown';
        this.cooldownTimer = 2000;
        this.target = null;
    }

    cooldown(delta) {
        const waterX = this.getWaterXAtCat();
        if (this.x < waterX + 45) {
            this.endChase();
            return;
        }

        this.cooldownTimer -= delta;
        if (this.cooldownTimer <= 0) {
            this.endChase();
        }
    }
}

export class Cat extends GroundPredator {
    constructor(scene, x, y, patrolMinX, patrolMaxX) {
        super(scene, x, y, patrolMinX, patrolMaxX, 'cat_sheet');

        const entityScale = this.entityScale ?? getEntityScaleFactor(scene?.scale?.width, scene?.scale?.height);
        this.baseScale = CAT_BASE_SCALE * entityScale;
        this.chaseScale = CAT_CHASE_SCALE * entityScale;
        this.alertScale = CAT_ALERT_SCALE * entityScale;
        this.attackScaleX = CAT_ATTACK_SCALE_X * entityScale;
        this.attackScaleY = CAT_ATTACK_SCALE_Y * entityScale;

        this.setScale(this.baseScale);
        this.body.setSize(200, 200);
        this.body.setOffset(150, 200);

        this.walkingFrames = [0, 1, 2, 3, 4, 5, 6];
        this.currentFrame = 0;

        this.patrolSpeed = 120;
        this.chaseSpeed = 320;
        this.visionRange = 185;
        this.senseRadius = 90;
        this.steerRate = 16;
        this.animationSpeed = 80;

        this.body.setVelocityX(this.patrolSpeed);
    }

    startChase(rail) {
        this.state = 'chase';
        this.target = rail;
        this.chaseStuckTimer = 0;
        this.lastChaseDistance = Infinity;
        this.chaseTimer = 0;

        this.setFrame(2);

        // Paw prints telegraph the charge before the cat closes in.
        this.scene.particleManager?.emitPawPrints?.(this.x, this.y, 4);

        if (rail.panic) {
            rail.panic();
        }

        if (Math.abs(rail.x - this.x) > 4) {
            this.setFlipX(rail.x < this.x);
        }

        this.scene.tweens.add({
            targets: this,
            scaleX: this.alertScale,
            scaleY: this.alertScale,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                this.setScale(this.chaseScale);
            }
        });
    }

    catchPrey() {
        this.state = 'attack';
        this.body.setVelocity(0, 0);

        this.setFrame(12);

        if (this.target && this.target.isAlive) {
            this.target.die('predator');
            this.scene.events.emit('railCaught', this.target);
        }

        this.scene.tweens.add({
            targets: this,
            scaleX: this.attackScaleX,
            scaleY: this.attackScaleY,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                this.setScale(this.baseScale);
                this.startCooldown();
            }
        });
    }
}
