import * as Phaser from 'phaser';
import { getEntityScaleFactor } from '../../utils/mobile.js';

const FOX_BASE_SCALE = 0.48;
const FOX_CHASE_SCALE = 0.51;
const FOX_ALERT_SCALE = 0.53;
const FOX_RUN_TEXTURES = [
    'fox_run_1', 'fox_run_2', 'fox_run_3', 'fox_run_4',
    'fox_run_5', 'fox_run_6', 'fox_run_7',
];
const FOX_POUNCE_TEXTURES = [
    'fox_pounce_1', 'fox_pounce_2', 'fox_pounce_3', 'fox_pounce_4',
    'fox_pounce_5', 'fox_pounce_6', 'fox_pounce_7', 'fox_pounce_8',
];
const POUNCE_CONTACT_FRAME = 2;

export class Fox extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, FOX_RUN_TEXTURES[0]);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        const entityScale = getEntityScaleFactor(scene?.scale?.width, scene?.scale?.height);
        this.entityScale = entityScale;
        this.baseScale = FOX_BASE_SCALE * entityScale;
        this.chaseScale = FOX_CHASE_SCALE * entityScale;
        this.alertScale = FOX_ALERT_SCALE * entityScale;

        this.setScale(this.baseScale);
        this.setDepth(4);

        this.body.setSize(220, 100);
        this.body.setOffset(115, 110);

        this.patrolSpeed = 115;
        this.chaseSpeed = 295;
        this.visionRange = 180;
        // Foxes also hunt by sound/smell: within this radius they notice prey
        // in any direction, even outside their forward line of sight.
        this.senseRadius = 95;
        // Floor the catch radius so lanes against the marsh clamp stay
        // reachable on small mobile scales.
        this.catchDistance = Math.max(26, 32 * entityScale);

        // Smooth steering + stuck detection for chase
        this.steerRate = 11;
        this.chaseStuckTimer = 0;
        this.lastChaseDistance = Infinity;

        this.patrolDirX = Math.random() < 0.5 ? -1 : 1;
        this.patrolDirY = Math.random() < 0.5 ? -1 : 1;
        this.headingAngle = 0.65;
        this.wanderTimer = 0;
        this.nextWanderInterval = 3000;

        this.state = 'patrol';
        this.target = null;
        this.cooldownTimer = 0;

        // Terrain response (pickleweed mats) and player diversion lures
        this.terrainFactor = 1;
        this.lureX = 0;
        this.lureY = 0;
        this.lureUntil = 0;

        this.runningFrames = FOX_RUN_TEXTURES;
        this.pounceFrames = FOX_POUNCE_TEXTURES;
        this.currentRunFrame = 0;
        this.currentPounceFrame = 0;
        this.animationTimer = 0;
        this.runAnimationSpeed = 90;
        this.pounceAnimationSpeed = 110;
        this.pounceResolved = false;

        this.shadow = scene.add.image(x, y, 'shadow')
            .setAlpha(0.28)
            .setDepth(-1);

        this.once('destroy', () => {
            if (this.shadow) this.shadow.destroy();
            this.shadow = null;
        });

        this.applyDiagonalVelocity();
    }

    getWaterXAtFox() {
        if (!this.scene || !this.scene.waterSystem) return 0;
        return this.scene.waterSystem.getWaterX(this.y);
    }

    applyDiagonalVelocity() {
        if (!this.body) return;
        const speed = this.patrolSpeed * (this.terrainFactor || 1);
        const vx = this.patrolDirX * Math.cos(this.headingAngle) * speed;
        const vy = this.patrolDirY * Math.sin(this.headingAngle) * speed;
        this.body.setVelocity(vx, vy);
        this.setFlipX(vx < 0);
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

    /** Trot toward a diversion point instead of running the state machine. */
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

    update(time, delta, rails) {
        if (!this.scene || !this.body) return;

        const marshTop = this.scene.marshTop !== undefined ? this.scene.marshTop : 100;
        const marshBottom = this.scene.marshBottom !== undefined ? this.scene.marshBottom : (this.scene.scale?.height || 600) - 100;
        const minY = marshTop + 15;
        const maxY = marshBottom - 15;

        const waterX = this.getWaterXAtFox();
        const safeWaterX = waterX + 45;
        const maxMarshX = (this.scene.scale?.width || 1000) - 100;

        if (this.y <= minY && this.patrolDirY < 0) {
            this.y = minY;
            this.patrolDirY = 1;
            if (this.state === 'patrol') this.applyDiagonalVelocity();
        } else if (this.y >= maxY && this.patrolDirY > 0) {
            this.y = maxY;
            this.patrolDirY = -1;
            if (this.state === 'patrol') this.applyDiagonalVelocity();
        }

        if (this.x <= safeWaterX && this.patrolDirX < 0) {
            this.x = safeWaterX;
            this.patrolDirX = 1;
            if (this.state === 'chase' || this.state === 'cooldown') {
                this.endChase();
            } else if (this.state === 'patrol') {
                this.applyDiagonalVelocity();
            }
        } else if (this.x >= maxMarshX && this.patrolDirX > 0) {
            this.x = maxMarshX;
            this.patrolDirX = -1;
            if (this.state === 'chase' || this.state === 'cooldown') {
                this.endChase();
            } else if (this.state === 'patrol') {
                this.applyDiagonalVelocity();
            }
        }

        if (this.shadow && this.body) {
            const worldW = this.body.width * Math.abs(this.scaleX);
            const worldH = this.body.height * Math.abs(this.scaleY);
            this.shadow.setPosition(this.x, this.y + worldH / 2 + 2);
            this.shadow.setScale(worldW / 128, (worldW / 128) * 0.32);
        }

        if (this.state === 'patrol' || this.state === 'chase') {
            this.animateRun(delta);
        }

        // Dense pickleweed tangles slow ground predators as they cross it.
        this.terrainFactor = this.getTerrainSlowFactor();

        // A player rustle or a Saltie sighting can pull the fox off the route —
        // but never mid-pounce.
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

    animateRun(delta) {
        this.animationTimer += delta;
        const frameDuration = this.state === 'chase'
            ? this.runAnimationSpeed * 0.78
            : this.runAnimationSpeed;

        if (this.animationTimer >= frameDuration) {
            this.animationTimer %= frameDuration;
            this.currentRunFrame = (this.currentRunFrame + 1) % this.runningFrames.length;
            this.setTexture(this.runningFrames[this.currentRunFrame]);
        }
    }

    patrol(delta) {
        this.wanderTimer += delta;
        if (this.wanderTimer >= this.nextWanderInterval) {
            this.wanderTimer = 0;
            this.nextWanderInterval = 2600 + Math.random() * 1800;
            this.headingAngle = 0.44 + Math.random() * 0.52;
        }

        const speed = this.patrolSpeed * this.terrainFactor;
        const vx = this.patrolDirX * Math.cos(this.headingAngle) * speed;
        const vy = this.patrolDirY * Math.sin(this.headingAngle) * speed;
        this.steer(vx, vy, delta);
        if (Math.abs(vx) > 1) this.setFlipX(vx < 0);
    }

    searchForPrey(rails) {
        if (!rails || !rails.children) return;

        const waterX = this.getWaterXAtFox();
        const safeWaterX = waterX + 45;

        const detectedRail = rails.children.entries.find(rail => {
            if (!rail.isAlive || !rail.isDetectable) return false;
            // Never lock onto a rail parked inside the water exclusion band,
            // where this predator is not allowed to follow.
            if (rail.x < safeWaterX) return false;
            return this.canSeeRail(rail);
        });

        if (detectedRail) {
            this.startChase(detectedRail);
        }
    }

    canSeeRail(rail) {
        const distance = Phaser.Math.Distance.Between(this.x, this.y, rail.x, rail.y);
        if (distance > this.visionRange) return false;

        // Close-range scent/hearing: notice prey in any direction.
        if (distance <= this.senseRadius) return true;

        // Beyond that, the rail must be in the fox's forward line of sight.
        const facingRight = !this.flipX;
        const railIsRight = rail.x > this.x;

        if (facingRight && !railIsRight) return false;
        if (!facingRight && railIsRight) return false;

        return true;
    }

    startChase(rail) {
        this.state = 'chase';
        this.target = rail;
        this.animationTimer = 0;
        this.chaseStuckTimer = 0;
        this.lastChaseDistance = Infinity;

        // Paw prints telegraph the sprint before the fox closes in.
        this.scene.particleManager?.emitPawPrints?.(this.x, this.y, 4);

        if (rail.panic) {
            rail.panic();
        }

        if (this.scene && this.scene.tweens) {
            this.scene.tweens.add({
                targets: this,
                scaleX: this.alertScale,
                scaleY: this.alertScale,
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    if (this.state === 'chase') {
                        this.setScale(this.chaseScale);
                    }
                }
            });
        }
    }

    chase(delta) {
        if (!this.target || !this.target.isAlive || !this.target.isDetectable) {
            this.endChase();
            return;
        }

        const waterX = this.getWaterXAtFox();
        const safeWaterX = waterX + 45;
        const marshTop = this.scene.marshTop !== undefined ? this.scene.marshTop : 100;
        const marshBottom = this.scene.marshBottom !== undefined ? this.scene.marshBottom : (this.scene.scale?.height || 600) - 100;
        const minY = marshTop + 15;
        const maxY = marshBottom - 15;
        const maxMarshX = (this.scene.scale?.width || 1000) - 100;

        if (this.target.x < safeWaterX || (this.x < safeWaterX && this.target.x <= this.x) || (this.x > maxMarshX && this.target.x >= this.x)) {
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
        // so the fox never freezes beside an unreachable rail.
        const isClamped = (this.x <= safeWaterX + 4) || (this.x >= maxMarshX - 4) || (this.y <= minY + 4) || (this.y >= maxY - 4);
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
        this.setScale(this.baseScale);
        this.currentPounceFrame = 0;
        this.animationTimer = 0;
        this.pounceResolved = false;
        this.setTexture(this.pounceFrames[0]);

        // Hold the live rail in place until the artwork reaches the bite pose.
        // Later pounce frames contain the rail, so the standalone sprite is
        // hidden at contact to avoid showing two birds.
        if (this.target && this.target.body) {
            this.target.isBeingCaught = true;
            this.target.body.setVelocity(0, 0);
        }
    }

    attack(delta) {
        this.animationTimer += delta;
        if (this.animationTimer < this.pounceAnimationSpeed) return;

        this.animationTimer %= this.pounceAnimationSpeed;
        if (this.currentPounceFrame < this.pounceFrames.length - 1) {
            this.currentPounceFrame++;
            this.setTexture(this.pounceFrames[this.currentPounceFrame]);

            if (this.currentPounceFrame === POUNCE_CONTACT_FRAME) {
                this.resolvePounce();
            }
            return;
        }

        if (!this.pounceResolved) this.resolvePounce();
        this.startCooldown();
    }

    resolvePounce() {
        if (this.pounceResolved) return;
        this.pounceResolved = true;

        if (this.target && this.target.isAlive) {
            this.target.setVisible(false);
            this.target.die('predator');
            this.scene.events.emit('railCaught', this.target);
        }
    }

    endChase() {
        this.state = 'patrol';
        this.target = null;
        this.chaseStuckTimer = 0;
        this.lastChaseDistance = Infinity;
        this.currentRunFrame = 0;
        this.animationTimer = 0;
        this.setTexture(this.runningFrames[0]);
        this.setScale(this.baseScale);

        const waterX = this.getWaterXAtFox();
        if (this.x < waterX + 65) {
            this.patrolDirX = 1;
        } else if (this.x > (this.scene.scale?.width || 1000) - 120) {
            this.patrolDirX = -1;
        }
        this.applyDiagonalVelocity();
    }

    startCooldown() {
        this.state = 'cooldown';
        this.cooldownTimer = 900;
        this.target = null;
    }

    cooldown(delta) {
        const waterX = this.getWaterXAtFox();
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
