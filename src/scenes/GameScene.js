import Phaser from 'phaser';

const TEXT_RES = window.devicePixelRatio || 2;
import { Rail } from '../entities/Rail.js';
import { Plant, PlantPreview, PLANT_TYPES } from '../entities/Plant.js';
import { Fox, Cat } from '../entities/predators/Fox.js';
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

        // Water system
        this.waterSystem = new WaterSystem(this, 50);

        // Setup input
        this.setupInput(width, height);

        // Setup collisions
        this.setupCollisions();

        // Start first level
        this.startLevel(1);

        // Spawn timer
        this.spawnTimer = 0;
        this.spawnInterval = 2000;

        // Connect UI scene
        this.connectUI();

        // Fade in
        this.cameras.main.fadeIn(500);
    }

    createEnvironment(width, height) {
        // Upland (safe zone) - far right
        for (let y = 0; y < height; y += 64) {
            for (let x = width - 150; x < width; x += 64) {
                const grass = this.add.image(x + 32, y + 32, 'grass');
                grass.setDepth(0);
            }
        }

        // Transition zone (middle)
        for (let y = 0; y < height; y += 64) {
            for (let x = 120; x < width - 150; x += 64) {
                const mud = this.add.image(x + 32, y + 32, 'mud');
                mud.setDepth(0);
            }
        }

        // Safe zone indicator
        const safeZoneGlow = this.add.rectangle(
            width - 75, height / 2,
            150, height,
            0x27ae60, 0.15
        );
        safeZoneGlow.setDepth(1);

        // Zone labels
        const safeLabel = this.add.text(width - 75, 30, 'SAFE ZONE', {
            fontFamily: 'Outfit',
            fontSize: '14px',
            color: '#27ae60',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(10);

        // Floating seed particles
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
        this.foxes = this.add.group();
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
        const { width, height } = this.scale;
        const waterX = this.waterSystem ? this.waterSystem.getWaterX() : 50;

        // Must be in transition zone
        if (x < waterX + 30) return false;
        if (x > width - 150) return false;
        if (y < 50 || y > height - 50) return false;

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

    startLevel(levelNumber) {
        const config = this.levelManager.startLevel(levelNumber);

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
        this.foxes.clear(true, true);
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

        // For Level 1, show interactive tutorial before starting waves
        if (levelNumber === 1 && !this.tutorialComplete) {
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
        const { width, height } = this.scale;
        const zoneStart = 200;
        const zoneEnd = width - 200;
        const zoneWidth = zoneEnd - zoneStart;

        // Spawn foxes
        for (let i = 0; i < config.foxCount; i++) {
            const patrolStart = zoneStart + (zoneWidth / config.foxCount) * i;
            const patrolEnd = patrolStart + (zoneWidth / config.foxCount);
            const y = 150 + (i % 3) * 180;

            const fox = new Fox(
                this,
                (patrolStart + patrolEnd) / 2,
                y,
                patrolStart,
                patrolEnd
            );
            this.foxes.add(fox);
        }

        // Spawn cats
        for (let i = 0; i < config.catCount; i++) {
            const patrolStart = zoneStart + 50 + (zoneWidth / config.catCount) * i;
            const patrolEnd = patrolStart + (zoneWidth / config.catCount) - 50;
            const y = 250 + (i % 2) * 200;

            const cat = new Cat(
                this,
                (patrolStart + patrolEnd) / 2,
                y,
                patrolStart,
                patrolEnd
            );
            this.foxes.add(cat);
        }

        // Spawn harriers
        for (let i = 0; i < config.harrierCount; i++) {
            const harrier = new Harrier(this, 200 + i * 300, 200 + i * 100);
            this.harriers.add(harrier);
        }
    }

    showLevelStart(config) {
        const { width, height } = this.scale;
        const compact = width < 600;

        const levelText = this.add.text(width / 2, height / 2 - 50,
            `LEVEL ${config.level}`, {
            fontFamily: 'Outfit',
            fontSize: compact ? '42px' : '64px',
            fontStyle: 'bold',
            color: '#f39c12',
            stroke: '#000000',
            strokeThickness: compact ? 5 : 8,
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(100);

        const nameText = this.add.text(width / 2, height / 2 + 20,
            config.name, {
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
        const panelY = height / 2 - 30;
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

        // Step 2 — success message
        const msg1 = this.add.text(width / 2, height / 2 - 30, 'Nice! Rails hide in plants to stay safe.', {
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
                        const msg2 = this.add.text(width / 2, height / 2 - 30,
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
        const { height } = this.scale;
        const y = Phaser.Math.Between(80, height - 80);
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
        this.foxes.children.entries.forEach(fox => {
            fox.update(time, delta, this.rails);
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
                if (distance < 35) {
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

        // Show marsh fact
        this.showMarshFact(config.marshFact, () => {
            // Advance to next level or win
            if (this.levelManager.currentLevel < 3) {
                this.startLevel(this.levelManager.currentLevel + 1);
            } else {
                // Game Won
                this.gameWon();
            }
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
