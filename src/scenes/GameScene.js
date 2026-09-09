import Phaser from 'phaser';

const TEXT_RES = window.devicePixelRatio || 2;
import { Rail } from '../entities/Rail.js';
import { Plant, PlantPreview, PLANT_TYPES } from '../entities/Plant.js';
import { Cat } from '../entities/predators/Cat.js';
import { Harrier } from '../entities/predators/Harrier.js';
import { ParticleManager } from '../effects/ParticleManager.js';
import { WaterSystem } from '../systems/WaterSystem.js';
import { SeedBank } from '../systems/SeedBank.js';
import { ScoreManager } from '../systems/ScoreManager.js';
import { LevelManager } from '../systems/LevelManager.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Game state
        this.isPaused = false;
        this.isGameOver = false;
        this.safeZoneX = width - 100;

        // Tutorial state
        this.tutorialActive = false;
        this.tutorialComplete = localStorage.getItem('htRefugiaTutorialDone') === 'true';
        this.tutorialElements = [];

        // Initialize systems
        this.particleManager = new ParticleManager(this);
        this.scoreManager = new ScoreManager(this);
        this.seedBank = new SeedBank(this);
        this.levelManager = new LevelManager(this);

        // Create environment
        this.createEnvironment(width, height);

        // Create entity groups
        this.createEntityGroups();

        // Water system (flood covers the marsh strip only, like the intro's shoreline)
        this.waterSystem = new WaterSystem(this, 50, this.marshTop, this.marshBottom);

        // Setup input
        this.setupInput(width, height);

        // Setup collisions
        this.setupCollisions();

        // Start the single tide event
        this.startLevel();

        // Spawn timer
        this.spawnTimer = 0;
        this.spawnInterval = 2000;

        // Connect UI scene
        this.connectUI();

        // Fade in
        this.cameras.main.fadeIn(500);
    }

    createEnvironment(width, height) {
        // ── Same banded composition as the menu/intro page ──
        // Sky 0..horizonY, static bay water horizonY..marshY, marsh marshY..height.
        // All gameplay (rails, plants, predators, tide flood) lives in the marsh strip.
        const portrait = height > width;
        this.horizonY = height * (portrait ? 0.34 : 0.40);
        this.marshY = height * (portrait ? 0.52 : 0.56);
        const { horizonY, marshY } = this;
        this.marshTop = marshY + 30;
        this.marshBottom = height - 30;

        // ── Sky: cool dusk gradient warming toward the horizon ──
        const sky = this.add.graphics().setDepth(-30);
        sky.fillGradientStyle(0x0b2545, 0x0b2545, 0x1d5c86, 0x1d5c86, 1, 1, 1, 1);
        sky.fillRect(0, 0, width, horizonY + 2);

        // Low sun with soft radial glow (right of centre, like the menu)
        const sunX = width * 0.72;
        const sunY = horizonY * 0.78;
        const sun = this.add.graphics().setDepth(-29);
        sun.setBlendMode(Phaser.BlendModes.ADD);
        sun.fillStyle(0xf39c12, 0.10);
        sun.fillCircle(sunX, sunY, horizonY * 0.42);
        sun.fillStyle(0xffd27a, 0.16);
        sun.fillCircle(sunX, sunY, horizonY * 0.26);
        sun.fillStyle(0xffe9b8, 0.55);
        sun.fillCircle(sunX, sunY, horizonY * 0.13);

        // ── Static bay water band under the sky ──
        const water = this.add.graphics().setDepth(-29);
        water.fillGradientStyle(0x1b4965, 0x1b4965, 0x0a2f49, 0x0a2f49, 1, 1, 1, 1);
        water.fillRect(0, horizonY, width, marshY - horizonY + 2);

        // Sun reflection: amber streaks fading with depth
        const refl = this.add.graphics().setDepth(-28);
        refl.setBlendMode(Phaser.BlendModes.ADD);
        for (let i = 0; i < 7; i++) {
            const t = i / 6;
            const y = horizonY + 6 + t * (marshY - horizonY - 12);
            const w = (1 - t) * 130 + 24;
            refl.fillStyle(0xffd27a, 0.20 * (1 - t) + 0.05);
            refl.fillEllipse(
                sunX + Phaser.Math.Between(-14, 14), y,
                w, Phaser.Math.Between(2, 4)
            );
        }

        // Shimmer lines across the static water
        for (let i = 0; i < 14; i++) {
            const y = Phaser.Math.Between(horizonY + 8, marshY - 8);
            const line = this.add.rectangle(
                Phaser.Math.Between(0, width), y,
                Phaser.Math.Between(24, 90), 2,
                0x9fd8e8, Phaser.Math.FloatBetween(0.10, 0.28)
            ).setDepth(-28);
            this.tweens.add({
                targets: line,
                alpha: { from: line.alpha, to: 0.02 },
                duration: Phaser.Math.Between(1200, 2600),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000),
            });
        }

        // ── Marsh: mud waterline shading into upland green ──
        const marsh = this.add.graphics().setDepth(-27);
        marsh.fillStyle(0x5d4e37, 1);
        marsh.fillRect(0, marshY, width, 30);
        marsh.fillGradientStyle(0x4a5d33, 0x4a5d33, 0x22331b, 0x22331b, 1, 1, 1, 1);
        marsh.fillRect(0, marshY + 24, width, height - marshY - 24);

        // Waterline foam
        const foam = this.add.graphics().setDepth(-26);
        foam.lineStyle(2, 0xffffff, 0.28);
        foam.beginPath();
        foam.moveTo(0, marshY + 2);
        for (let x = 0; x <= width; x += 24) {
            foam.lineTo(x, marshY + 2 + Math.sin(x * 0.045) * 2.2);
        }
        foam.strokePath();

        // ── Perspective reed clusters in the marsh (taller toward foreground) ──
        const reeds = this.add.graphics().setDepth(-25);
        const clusters = Math.round(width / 130);
        for (let i = 0; i < clusters; i++) {
            const x = Phaser.Math.Between(10, width - 10);
            const depth = Phaser.Math.FloatBetween(0.15, 1);
            const y = marshY + 30 + depth * (height - marshY - 55);
            const h = 12 + depth * 30;
            const blades = Phaser.Math.Between(4, 6);
            for (let b = 0; b < blades; b++) {
                const bx = x + (b - blades / 2) * (5 + depth * 4);
                const lean = Phaser.Math.Between(-8, 8);
                const p0x = bx, p0y = y;
                const p1x = bx + lean * 0.4, p1y = y - h * 0.6;
                const p2x = bx + lean, p2y = y - h;
                reeds.lineStyle(1.5 + depth, 0x1e3d1a, 0.85);
                reeds.beginPath();
                reeds.moveTo(p0x, p0y);
                for (let s = 1; s <= 6; s++) {
                    const t = s / 6;
                    const mt = 1 - t;
                    reeds.lineTo(
                        mt * mt * p0x + 2 * mt * t * p1x + t * t * p2x,
                        mt * mt * p0y + 2 * mt * t * p1y + t * t * p2y
                    );
                }
                reeds.strokePath();
            }
        }

        // Gumplant dressing along the waterline (kept clear of gameplay UI)
        const uplandX = width - 150;
        const clumps = Math.max(4, Math.round(width / 260));
        for (let i = 0; i < clumps; i++) {
            const x = Phaser.Math.Between(30, uplandX - 60);
            const y = marshY + Phaser.Math.Between(24, 60);
            this.add.image(x, y, 'gumplant')
                .setScale(Phaser.Math.FloatBetween(0.16, 0.24))
                .setAlpha(0.55)
                .setDepth(-24);
        }

        // ── Upland / safe zone strip (right edge) ──
        const upland = this.add.graphics().setDepth(-24);
        upland.fillGradientStyle(0x4a6b2e, 0x4a6b2e, 0x2f4a1d, 0x2f4a1d, 1, 1, 1, 1);
        upland.fillRect(uplandX, marshY, width - uplandX, height - marshY);
        upland.fillGradientStyle(0x4a6b2e, 0x4a6b2e, 0x4a6b2e, 0x4a6b2e, 0, 0.85, 0, 0.85);
        upland.fillRect(uplandX - 70, marshY, 100, height - marshY);

        // Safe zone indicator
        const safeZoneGlow = this.add.rectangle(
            width - 75, (marshY + height) / 2,
            150, height - marshY,
            0x27ae60, 0.15
        );
        safeZoneGlow.setDepth(1);

        // Zone labels
        this.add.text(width - 75, marshY + 18, 'SAFE ZONE', {
            fontFamily: 'Outfit',
            fontSize: '14px',
            color: '#27ae60',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(10);

        // Vignette to seat the composition
        const vignette = this.add.graphics().setDepth(8);
        vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.3, 0.3, 0, 0);
        vignette.fillRect(0, 0, width, height * 0.09);
        vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.28, 0.28);
        vignette.fillRect(0, height * 0.93, width, height * 0.07);

        // Floating seed particles over the marsh
        this.particleManager.createFloatingSeeds(width, height);
    }

    createEntityGroups() {
        // Rails (birds)
        this.rails = this.physics.add.group({
            classType: Rail,
            runChildUpdate: true,
        });

        // Plants
        this.plants = this.physics.add.staticGroup();

        // Predators
        this.groundPredators = this.add.group();
        this.harriers = this.add.group();

        // Plant variety rotation index
        this.nextPlantIndex = 0;

        // Plant preview
        this.plantPreview = new PlantPreview(this, 0, 0);
        this.plantPreview.setPlantType(PLANT_TYPES[0].key);
    }

    setupInput(width, height) {
        // Mouse/touch for planting
        this.input.on('pointermove', (pointer) => {
            if (this.isPaused || this.isGameOver) return;

            const canPlace = this.canPlantAt(pointer.x, pointer.y);
            this.plantPreview.show(pointer.x, pointer.y, canPlace);
        });

        this.input.on('pointerdown', (pointer) => {
            if (this.isPaused || this.isGameOver) return;
            this.tryPlantAt(pointer.x, pointer.y);
        });

        this.input.on('pointerout', () => {
            this.plantPreview.hide();
        });

        // Pause key
        this.input.keyboard.on('keydown-ESC', () => {
            this.togglePause();
        });
    }

    setupCollisions() {
        // Rails entering plants
        this.physics.add.overlap(
            this.rails,
            this.plants,
            (rail, plant) => {
                if (!rail.isSafe) {
                    plant.onRailEnter(rail);
                }
            },
            null,
            this
        );

        // Listen for rails caught
        this.events.on('railCaught', (rail) => {
            this.scoreManager.railLost(rail, 'predator');
        });
    }

    canPlantAt(x, y) {
        const { width } = this.scale;
        const waterX = this.waterSystem ? this.waterSystem.getWaterX() : 50;

        // Must be in the marsh strip (below the intro-style waterline)
        if (x < waterX + 30) return false;
        if (x > width - 150) return false;
        if (y < this.marshTop || y > this.marshBottom) return false;

        // Check if too close to another plant
        const tooClose = this.plants.children.entries.some(plant => {
            const distance = Phaser.Math.Distance.Between(x, y, plant.x, plant.y);
            return distance < 50;
        });

        if (tooClose) return false;

        // Check seed bank
        return this.seedBank.canPlant();
    }

    tryPlantAt(x, y) {
        if (!this.canPlantAt(x, y)) {
            // Feedback for failed plant
            this.cameras.main.shake(50, 0.002);
            return;
        }

        // Spend seeds
        if (!this.seedBank.spendSeeds()) return;

        // Pick current plant species and advance to next
        const plantType = PLANT_TYPES[this.nextPlantIndex % PLANT_TYPES.length].key;
        this.nextPlantIndex++;
        this.plantPreview.setPlantType(PLANT_TYPES[this.nextPlantIndex % PLANT_TYPES.length].key);

        // Create plant
        const plant = new Plant(this, x, y, plantType);
        this.plants.add(plant);

        // If tutorial is active, first plant was placed — advance tutorial
        if (this.tutorialActive) {
            this.completeTutorial();
        }

        // Sound effect would go here
    }

    startLevel() {
        const config = this.levelManager.startLevel();

        // Reset water
        if (this.waterSystem) {
            this.waterSystem.reset();
            this.waterSystem.setSpeed(config.waterSpeed);
        }

        // Update seed bank
        this.seedBank.maxSeeds = config.maxSeeds;
        this.seedBank.setRegenRate(config.seedRegen);
        this.seedBank.reset();

        // Clear entities
        this.rails.clear(true, true);
        this.plants.clear(true, true);
        this.groundPredators.clear(true, true);
        this.harriers.clear(true, true);

        // Spawn predators
        this.spawnPredators(config);

        // King tide?
        if (config.isKingTide && this.waterSystem) {
            this.time.delayedCall(3000, () => {
                this.waterSystem.triggerKingTide();
            });
        }

        // Show level start
        this.showLevelStart(config);

        // Single level: interactive tutorial only on first-ever play,
        // then straight into the wave sequence.
        if (!this.tutorialComplete) {
            // Tutorial will call startNextWave() when done
            this.time.delayedCall(2800, () => {
                this.startTutorial();
            });
        } else {
            // Start first wave immediately after level announcement
            this.levelManager.startNextWave();
        }
    }

    spawnPredators(config) {
        const { width } = this.scale;
        const zoneStart = 200;
        const zoneEnd = width - 200;
        const zoneWidth = zoneEnd - zoneStart;
        const top = this.marshTop + 10;
        const bottom = this.marshBottom - 10;

        // Spawn cats
        for (let i = 0; i < config.catCount; i++) {
            const patrolStart = zoneStart + 50 + (zoneWidth / config.catCount) * i;
            const patrolEnd = patrolStart + (zoneWidth / config.catCount) - 50;
            const y = top + ((bottom - top) * ((i % 2) + 0.5)) / 2;

            const cat = new Cat(
                this,
                (patrolStart + patrolEnd) / 2,
                y,
                patrolStart,
                patrolEnd
            );
            this.groundPredators.add(cat);
        }

        // Spawn harriers
        for (let i = 0; i < config.harrierCount; i++) {
            const harrier = new Harrier(this, 200 + i * 300, (top + bottom) / 2);
            harrier.minY = top;
            harrier.maxY = bottom;
            this.harriers.add(harrier);
        }
    }

    showLevelStart(config) {
        const { width, height } = this.scale;
        const compact = width < 600;
        const bandY = (this.marshY + height) / 2;

        const levelText = this.add.text(width / 2, bandY - 50,
            config.name.toUpperCase(), {
            fontFamily: 'Outfit',
            fontSize: compact ? '42px' : '64px',
            fontStyle: 'bold',
            color: '#f39c12',
            stroke: '#000000',
            strokeThickness: compact ? 5 : 8,
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(100);

        const nameText = this.add.text(width / 2, bandY + 20,
            'Survive the rising tide', {
            fontFamily: 'Outfit',
            fontSize: compact ? '22px' : '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(100);

        this.tweens.add({
            targets: [levelText, nameText],
            alpha: { from: 0, to: 1 },
            scale: { from: 0.5, to: 1 },
            duration: 500,
            ease: 'Back.easeOut',
        });

        this.tweens.add({
            targets: [levelText, nameText],
            alpha: 0,
            y: '-=50',
            delay: 2000,
            duration: 500,
            onComplete: () => {
                levelText.destroy();
                nameText.destroy();
            }
        });
    }

    // ── Interactive first-play tutorial ──────────────────────────
    startTutorial() {
        this.tutorialActive = true;
        const { width, height } = this.scale;
        const compact = width < 600;

        this.spawnRail();

        const panelX = width / 2;
        const panelY = (this.marshY + height) / 2 - 40;
        const panelW = Math.min(360, width - 40);
        const panel = this.add.graphics().setDepth(90);
        panel.fillStyle(0x000000, 0.7);
        panel.fillRoundedRect(panelX - panelW / 2, panelY - 50, panelW, 100, 16);

        const arrow = this.add.text(panelX, panelY + 60, '\u25bc', {
            fontFamily: 'Outfit',
            fontSize: compact ? '28px' : '36px',
            color: '#f1c40f',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(91);

        const hint = this.add.text(panelX, panelY - 10, 'TAP here to plant cover!', {
            fontFamily: 'Outfit',
            fontSize: compact ? '18px' : '24px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(91);

        const subHint = this.add.text(panelX, panelY + 22, 'Rails need vegetation to hide from predators', {
            fontFamily: 'Outfit',
            fontSize: compact ? '11px' : '14px',
            color: '#aaaaaa',
            resolution: TEXT_RES,
            wordWrap: { width: panelW - 20 },
            align: 'center',
        }).setOrigin(0.5).setDepth(91);

        this.tweens.add({
            targets: [hint],
            scale: { from: 1, to: 1.06 },
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        this.tweens.add({
            targets: arrow,
            y: arrow.y + 14,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        this.tutorialElements = [panel, arrow, hint, subHint];
    }

    completeTutorial() {
        // Remove hint elements
        this.tutorialElements.forEach(el => el.destroy());
        this.tutorialElements = [];

        const { width, height } = this.scale;
        const msgY = (this.marshY + height) / 2 - 40;

        // Step 2 — success message
        const msg1 = this.add.text(width / 2, msgY, 'Nice! Rails hide in plants to stay safe.', {
            fontFamily: 'Outfit',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#2ecc71',
            stroke: '#000000',
            strokeThickness: 4,
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(91).setAlpha(0);

        this.tweens.add({
            targets: msg1,
            alpha: 1,
            duration: 400,
            onComplete: () => {
                this.tweens.add({
                    targets: msg1,
                    alpha: 0,
                    delay: 2000,
                    duration: 400,
                    onComplete: () => {
                        msg1.destroy();

                        // Step 3 — corridor hint
                        const msg2 = this.add.text(width / 2, msgY,
                            'Plant more to create a corridor to the safe zone  →', {
                            fontFamily: 'Outfit',
                            fontSize: '20px',
                            fontStyle: 'bold',
                            color: '#f1c40f',
                            stroke: '#000000',
                            strokeThickness: 4,
                            resolution: TEXT_RES,
                        }).setOrigin(0.5).setDepth(91).setAlpha(0);

                        this.tweens.add({
                            targets: msg2,
                            alpha: 1,
                            duration: 400,
                            onComplete: () => {
                                this.tweens.add({
                                    targets: msg2,
                                    alpha: 0,
                                    delay: 2000,
                                    duration: 400,
                                    onComplete: () => {
                                        msg2.destroy();
                                        this.finishTutorial();
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    finishTutorial() {
        this.tutorialActive = false;
        this.tutorialComplete = true;
        localStorage.setItem('htRefugiaTutorialDone', 'true');

        // Begin normal wave spawning
        this.levelManager.startNextWave();
    }

    spawnRail() {
        const y = Phaser.Math.Between(this.marshTop, this.marshBottom);
        const waterX = this.waterSystem ? this.waterSystem.getWaterX() : 50;
        const speedMul = this.levelManager.getCurrentConfig().railSpeedMultiplier || 1;

        const rail = new Rail(this, waterX + 40, y, speedMul);
        this.rails.add(rail);

        return rail;
    }

    update(time, delta) {
        if (this.isPaused || this.isGameOver) return;

        // Update systems
        this.waterSystem.update(delta);
        this.seedBank.update(delta);

        // Update predators
        this.groundPredators.children.entries.forEach(predator => {
            predator.update(time, delta, this.rails);
        });

        this.harriers.children.entries.forEach(harrier => {
            harrier.update(time, delta, this.rails, this.plants);
        });

        // Check rails against water
        this.checkWaterCollisions();

        // Check rails reaching safety
        this.checkSafeZone();

        // Check rail-plant overlaps (continuous)
        this.updateRailPlantOverlaps();

        // Spawn rails
        this.updateSpawning(delta);

        // Check win/lose conditions
        this.checkGameState();
    }

    checkWaterCollisions() {
        const waterX = this.waterSystem.getWaterX();

        this.rails.children.entries.forEach(rail => {
            if (rail.isAlive && rail.x < waterX + 20) {
                rail.die('water');
                this.scoreManager.railLost(rail, 'water');
                this.particleManager.emitWaterSplash(rail.x, rail.y);
            }
        });
    }

    checkSafeZone() {
        this.rails.children.entries.forEach(rail => {
            if (rail.isAlive && !rail.hasReachedSafety && rail.x >= this.safeZoneX) {
                const isPerfect = rail.reachSafety();
                this.scoreManager.railSaved(rail);
            }
        });
    }

    updateRailPlantOverlaps() {
        this.rails.children.entries.forEach(rail => {
            if (!rail.isAlive) return;

            let isOverlappingPlant = false;

            this.plants.children.entries.forEach(plant => {
                const distance = Phaser.Math.Distance.Between(rail.x, rail.y, plant.x, plant.y);
                // Young sprouts are too small to hide a rail
                if (distance < 35 && plant.isCover && plant.isCover()) {
                    isOverlappingPlant = true;
                    if (!rail.isSafe) {
                        rail.enterPlant();
                    }
                }
            });

            if (!isOverlappingPlant && rail.isSafe) {
                rail.exitPlant();
            }
        });
    }

    updateSpawning(delta) {
        // Don't spawn additional rails during tutorial
        if (this.tutorialActive) return;

        if (this.levelManager.isWaveComplete()) {
            // Check if all rails from wave are done
            const activeRails = this.rails.children.entries.filter(r => r.isAlive && !r.hasReachedSafety);

            if (activeRails.length === 0) {
                if (this.levelManager.isLevelComplete()) {
                    this.completeLevel();
                } else {
                    // Start next wave
                    this.levelManager.startNextWave();
                    this.spawnTimer = 0;
                }
            }
            return;
        }

        this.spawnTimer += delta;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnRail();
            this.levelManager.recordRailSpawned();

            // Vary spawn interval slightly
            this.spawnInterval = Phaser.Math.Between(1500, 2500);
        }
    }

    checkGameState() {
        // Don't end game during tutorial
        if (this.tutorialActive) return;

        const waterX = this.waterSystem.getWaterX();
        const stats = this.scoreManager.getStats();
        const { width } = this.scale;

        // Game over if too many rails are lost
        if (stats.railsLost > 5) {
            this.gameOver('Too many rails lost!');
            return;
        }

        // Game over if water reaches safe zone
        if (waterX >= this.safeZoneX - 50) {
            this.gameOver('The tide has risen too high!');
        }
    }

    completeLevel() {
        const config = this.levelManager.getCurrentConfig();

        // Single level: surviving all waves wins the game.
        this.showMarshFact(config.marshFact, () => {
            this.gameWon();
        });
    }

    gameWon() {
        if (this.isGameOver) return;
        this.isGameOver = true;

        const stats = this.scoreManager.getStats();

        // Transition to game over scene with victory reason
        this.cameras.main.fadeOut(500);
        this.time.delayedCall(500, () => {
            this.scene.stop('UIScene');
            this.scene.start('GameOverScene', {
                stats,
                reason: 'You saved the marsh!',
                level: this.levelManager.currentLevel,
                victory: true
            });
        });
    }

    showMarshFact(fact, onComplete) {
        const { width, height } = this.scale;
        const compact = width < 600;
        this.isPaused = true;

        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
            .setDepth(100);

        const panelW = Math.min(600, width - 40);
        const panelH = compact ? 200 : 240;
        const panel = this.add.graphics().setDepth(101);
        panel.fillStyle(0x1a2a1a, 0.95);
        panel.fillRoundedRect(width / 2 - panelW / 2, height / 2 - panelH / 2, panelW, panelH, 20);
        panel.lineStyle(2, 0x27ae60);
        panel.strokeRoundedRect(width / 2 - panelW / 2, height / 2 - panelH / 2, panelW, panelH, 20);

        const leafL = this.add.image(width / 2 - (compact ? 70 : 100), height / 2 - panelH / 2 + 40, 'icon_leaf').setScale(1.2).setDepth(102);
        const title = this.add.text(width / 2, height / 2 - panelH / 2 + 40, 'MARSH FACT', {
            fontFamily: 'Outfit',
            fontSize: compact ? '22px' : '28px',
            fontStyle: 'bold',
            color: '#27ae60',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(102);
        const leafR = this.add.image(width / 2 + (compact ? 70 : 100), height / 2 - panelH / 2 + 40, 'icon_leaf').setScale(1.2).setDepth(102);

        const factText = this.add.text(width / 2, height / 2, fact, {
            fontFamily: 'Outfit',
            fontSize: compact ? '14px' : '18px',
            color: '#ffffff',
            wordWrap: { width: panelW - 60 },
            align: 'center',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(102);

        const continueText = this.add.text(width / 2, height / 2 + panelH / 2 - 40, 'Tap to continue...', {
            fontFamily: 'Outfit',
            fontSize: compact ? '13px' : '16px',
            color: '#888888',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(102);

        this.time.delayedCall(1000, () => {
            overlay.setInteractive();
            overlay.on('pointerdown', () => {
                overlay.destroy();
                panel.destroy();
                title.destroy();
                leafL.destroy();
                leafR.destroy();
                factText.destroy();
                continueText.destroy();
                this.isPaused = false;
                if (onComplete) onComplete();
            });
        });
    }

    gameOver(reason) {
        if (this.isGameOver) return;
        this.isGameOver = true;

        const stats = this.scoreManager.getStats();

        // Transition to game over scene
        this.cameras.main.fadeOut(500);
        this.time.delayedCall(500, () => {
            this.scene.stop('UIScene');
            this.scene.start('GameOverScene', {
                stats,
                reason,
                level: this.levelManager.currentLevel,
            });
        });
    }

    togglePause() {
        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.physics.pause();
        } else {
            this.physics.resume();
        }

        // Notify UI
        this.events.emit('pauseToggle', this.isPaused);
    }

    connectUI() {
        const uiScene = this.scene.get('UIScene');

        // Connect seed bank
        this.seedBank.onUpdate = (current, max) => {
            this.events.emit('seedsUpdate', current, max);
        };

        // Connect score
        this.scoreManager.onScoreUpdate = (score, combo) => {
            this.events.emit('scoreUpdate', score, combo);
        };

        this.scoreManager.onStatsUpdate = (stats) => {
            this.events.emit('statsUpdate', stats);
        };

        // Initial update
        this.seedBank.notifyUpdate();
        this.scoreManager.notifyUpdate();
    }
}
