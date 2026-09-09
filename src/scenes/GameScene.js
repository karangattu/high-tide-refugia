import Phaser from 'phaser';

const TEXT_RES = window.devicePixelRatio || 2;
import { Rail } from '../entities/Rail.js';
import { Plant, PlantPreview, getPlantTypeForX } from '../entities/Plant.js';
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

        this.waterSystem = new WaterSystem(this, 50, this.marshY, height);

        this.setupInput();

        // Setup collisions
        this.setupCollisions();

        // Start the single tide event
        this.startLevel();

        // Spawn timer
        this.spawnTimer = 0;
        this.spawnInterval = 2000;

        // Connect UI scene
        this.connectUI();

        if (this.cache.audio.exists('rail_call')) {
            this.railCallBgm = this.sound.get('rail_call') || this.sound.add('rail_call', { loop: true, volume: 0.35 });
            this.railCallBgm.setVolume(0.35);
            if (!this.railCallBgm.isPlaying) {
                this.railCallBgm.play();
            }
        }

        this.events.once('shutdown', () => {
            if (this.railCallBgm) {
                this.railCallBgm.stop();
            }
        });

        // Fade in
        this.cameras.main.fadeIn(500);
    }

    createEnvironment(width, height) {
        // ── Same banded composition as the menu/intro page ──
        // Sky 0..horizonY, static bay water horizonY..marshY, marsh marshY..height.
        // All gameplay (rails, plants, predators, tide flood) lives in the marsh strip.
        const portrait = height > width;
        const isMobileLandscape = height <= 520 || (width < 768 && height < 600);
        this.horizonY = height * (portrait ? 0.34 : (isMobileLandscape ? 0.22 : 0.40));
        this.marshY = height * (portrait ? 0.52 : (isMobileLandscape ? 0.38 : 0.56));
        const { horizonY, marshY } = this;
        const footerH = isMobileLandscape ? 34 : 50;
        this.marshTop = marshY + (isMobileLandscape ? 24 : 30);
        this.marshBottom = height - footerH - 45;

        const sky = this.add.graphics().setDepth(-30);
        sky.fillGradientStyle(0x1976d2, 0x1976d2, 0xffd54f, 0xffd54f, 1, 1, 1, 1);
        sky.fillRect(0, 0, width, horizonY + 2);

        const sunX = width * 0.72;
        const sunY = horizonY * 0.46;
        const sun = this.add.graphics().setDepth(-29);
        sun.setBlendMode(Phaser.BlendModes.ADD);
        sun.fillStyle(0xffa726, 0.20);
        sun.fillCircle(sunX, sunY, horizonY * 0.48);
        sun.fillStyle(0xffca28, 0.42);
        sun.fillCircle(sunX, sunY, horizonY * 0.28);
        sun.fillStyle(0xfff59d, 0.85);
        sun.fillCircle(sunX, sunY, horizonY * 0.15);
        sun.fillStyle(0xffffff, 0.98);
        sun.fillCircle(sunX, sunY, horizonY * 0.08);

        sun.lineStyle(2, 0xffeb3b, 0.35);
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const r1 = horizonY * 0.18;
            const r2 = horizonY * 0.44;
            sun.beginPath();
            sun.moveTo(sunX + Math.cos(angle) * r1, sunY + Math.sin(angle) * r1);
            sun.lineTo(sunX + Math.cos(angle) * r2, sunY + Math.sin(angle) * r2);
            sun.strokePath();
        }

        const water = this.add.graphics().setDepth(-29);
        water.fillGradientStyle(0x1565c0, 0x1565c0, 0x00838f, 0x00838f, 1, 1, 1, 1);
        water.fillRect(0, horizonY, width, marshY - horizonY + 2);

        const refl = this.add.graphics().setDepth(-28);
        refl.setBlendMode(Phaser.BlendModes.ADD);
        for (let i = 0; i < 8; i++) {
            const t = i / 7;
            const y = horizonY + 6 + t * (marshY - horizonY - 12);
            const w = (1 - t) * 140 + 28;
            refl.fillStyle(0xffe082, 0.32 * (1 - t) + 0.08);
            refl.fillEllipse(
                sunX + Phaser.Math.Between(-12, 12), y,
                w, Phaser.Math.Between(2, 4)
            );
        }

        for (let i = 0; i < 14; i++) {
            const y = Phaser.Math.Between(horizonY + 8, marshY - 8);
            const line = this.add.rectangle(
                Phaser.Math.Between(0, width), y,
                Phaser.Math.Between(24, 90), 2,
                0x9fd8e8, Phaser.Math.FloatBetween(0.12, 0.32)
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

        const marsh = this.add.graphics().setDepth(-27);
        marsh.fillStyle(0x5d4e37, 1);
        marsh.fillRect(0, marshY, width, 30);
        marsh.fillGradientStyle(0x4a5d33, 0x4a5d33, 0x22331b, 0x22331b, 1, 1, 1, 1);
        marsh.fillRect(0, marshY + 24, width, height - marshY - 24);

        const foam = this.add.graphics().setDepth(-26);
        foam.lineStyle(2, 0xffffff, 0.28);
        foam.beginPath();
        foam.moveTo(0, marshY + 2);
        for (let x = 0; x <= width; x += 24) {
            foam.lineTo(x, marshY + 2 + Math.sin(x * 0.045) * 2.2);
        }
        foam.strokePath();

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

        const uplandX = width - 150;

        const cordgrassCount = Math.round((height - this.marshY) / 20);
        for (let i = 0; i <= cordgrassCount; i++) {
            const y = this.marshY + 10 + i * 20 + Phaser.Math.Between(-6, 6);
            const x = Phaser.Math.Between(15, 80);
            const scale = Phaser.Math.FloatBetween(0.24, 0.32);
            const cg = this.add.image(x, y, 'cordgrass_8')
                .setScale(scale)
                .setDepth(6);
            this.tweens.add({
                targets: cg,
                rotation: { from: -0.04, to: 0.04 },
                duration: Phaser.Math.Between(2200, 3600),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: Phaser.Math.Between(0, 1500),
            });
        }

        const upland = this.add.graphics().setDepth(-24);
        upland.fillGradientStyle(0x4a6b2e, 0x4a6b2e, 0x2f4a1d, 0x2f4a1d, 1, 1, 1, 1);
        upland.fillRect(uplandX, marshY, width - uplandX, height - marshY);
        upland.fillGradientStyle(0x4a6b2e, 0x4a6b2e, 0x4a6b2e, 0x4a6b2e, 0, 0.85, 0, 0.85);
        upland.fillRect(uplandX - 70, marshY, 100, height - marshY);

        const gumplantCount = Math.round((this.marshBottom - this.marshTop) / 20);
        for (let i = 0; i <= gumplantCount; i++) {
            const y = this.marshTop + i * 20 + Phaser.Math.Between(-8, 8);
            const x = uplandX + Phaser.Math.Between(10, 100);
            const scale = Phaser.Math.FloatBetween(0.26, 0.34);
            const gp = this.add.image(x, y, 'gumplant_8')
                .setScale(scale)
                .setDepth(2);
            this.tweens.add({
                targets: gp,
                scaleX: scale * 1.04,
                duration: Phaser.Math.Between(2400, 3800),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: Phaser.Math.Between(0, 1800),
            });
        }

        const safeZoneGlow = this.add.rectangle(
            width - 75, (marshY + height) / 2,
            150, height - marshY,
            0x27ae60, 0.12
        );
        safeZoneGlow.setDepth(1);

        this.add.text(width - 75, marshY + 22, 'SAFE REFUGE', {
            fontFamily: 'Outfit',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#2ecc71',
            stroke: '#0c1a0c',
            strokeThickness: 4,
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(10);

        const vignette = this.add.graphics().setDepth(8);
        vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.25, 0.25, 0, 0);
        vignette.fillRect(0, 0, width, height * 0.08);
        vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.25, 0.25);
        vignette.fillRect(0, height * 0.94, width, height * 0.06);

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

        // Plant preview
        this.plantPreview = new PlantPreview(this, 0, 0);
        this.plantPreview.setPlantType('cordgrass');
    }

    setupInput() {
        // Mouse/touch for planting
        this.input.on('pointermove', (pointer) => {
            if (this.isPaused || this.isGameOver) return;

            const plantType = getPlantTypeForX(pointer.x, this.scale.width);
            this.plantPreview.setPlantType(plantType);
            const canPlace = this.canPlantAt(pointer.x, pointer.y);
            this.plantPreview.show(pointer.x, pointer.y, canPlace);
        });

        this.input.on('pointerdown', (pointer) => {
            if (this.isPaused || this.isGameOver) return;
            const plantType = getPlantTypeForX(pointer.x, this.scale.width);
            this.plantPreview.setPlantType(plantType);
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

        const plantType = getPlantTypeForX(x, this.scale.width);
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
        const compact = height <= 520 || width < 650;
        const bandY = (this.marshY + height) / 2;

        const levelText = this.add.text(width / 2, bandY - 60,
            config.name.toUpperCase(), {
            fontFamily: 'Outfit',
            fontSize: compact ? '56px' : '84px',
            fontStyle: 'bold',
            color: '#f39c12',
            stroke: '#000000',
            strokeThickness: compact ? 6 : 9,
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(100);

        const nameText = this.add.text(width / 2, bandY + 30,
            'Survive the rising tide', {
            fontFamily: 'Outfit',
            fontSize: compact ? '28px' : '40px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
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
        const compact = height <= 520 || width < 650;

        this.spawnRail();

        const panelX = width / 2;
        const panelY = (this.marshY + height) / 2 - 40;
        const panelW = Math.min(480, width - 40);
        const panel = this.add.graphics().setDepth(90);
        panel.fillStyle(0x000000, 0.7);
        panel.fillRoundedRect(panelX - panelW / 2, panelY - 65, panelW, 130, 16);

        const arrow = this.add.text(panelX, panelY + 78, '\\u25bc', {
            fontFamily: 'Outfit',
            fontSize: compact ? '36px' : '46px',
            color: '#f1c40f',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(91);

        const hint = this.add.text(panelX, panelY - 16, 'TAP here to plant cover!', {
            fontFamily: 'Outfit',
            fontSize: compact ? '24px' : '32px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(91);

        const subHint = this.add.text(panelX, panelY + 30, 'Rails need vegetation to hide from predators', {
            fontFamily: 'Outfit',
            fontSize: compact ? '15px' : '19px',
            color: '#aaaaaa',
            resolution: TEXT_RES,
            wordWrap: { width: panelW - 30 },
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
            fontSize: '30px',
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
                            fontSize: '28px',
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
        const waterX = this.waterSystem ? this.waterSystem.getWaterX(y) : 50;
        const speedMul = this.levelManager.getCurrentConfig().railSpeedMultiplier || 1;
        const spawnX = Math.max(35, waterX + 35);

        const rail = new Rail(this, spawnX, y, speedMul);
        this.rails.add(rail);

        if (this.particleManager) {
            this.particleManager.emitDirt(spawnX - 10, y);
        }

        return rail;
    }

    update(time, delta) {
        if (this.isPaused || this.isGameOver) return;

        this.waterSystem.update(delta);
        this.seedBank.update(delta);

        this.groundPredators.children.entries.forEach(predator => {
            predator.update(time, delta, this.rails);
        });

        this.harriers.children.entries.forEach(harrier => {
            harrier.update(time, delta, this.rails, this.plants);
        });

        this.checkWaterCollisions();

        this.checkSafeZone();

        this.updateRailPlantOverlaps();

        this.updateSpawning(delta);

        this.checkGameState();
    }

    checkWaterCollisions() {
        this.rails.children.entries.forEach(rail => {
            if (rail.isAlive) {
                const waterXAtY = this.waterSystem.getWaterX(rail.y);
                if (rail.x < waterXAtY + 12) {
                    rail.die('water');
                    this.scoreManager.railLost(rail, 'water');
                    this.particleManager.emitWaterSplash(rail.x, rail.y);
                }
            }
        });
    }

    checkSafeZone() {
        this.rails.children.entries.forEach(rail => {
            if (rail.isAlive && !rail.hasReachedSafety && rail.x >= this.safeZoneX) {
                rail.reachSafety();
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

        // Game over if too many rails are lost
        if (stats.railsLost > 5) {
            this.gameOver('Too many rails were lost to predators.');
            return;
        }

        // Game over if water reaches safe zone
        if (waterX >= this.safeZoneX - 50) {
            this.gameOver('The king tide submerged the safe refuge.');
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

        if (this.railCallBgm && this.railCallBgm.isPlaying) {
            this.tweens.add({
                targets: this.railCallBgm,
                volume: 0,
                duration: 450,
                onComplete: () => {
                    if (this.railCallBgm) {
                        this.railCallBgm.stop();
                    }
                }
            });
        }

        const stats = this.scoreManager.getStats();

        // Transition to game over scene with victory reason
        this.cameras.main.fadeOut(500);
        this.time.delayedCall(500, () => {
            this.scene.stop('UIScene');
            this.scene.start('GameOverScene', {
                stats,
                reason: stats.railsLost === 0
                    ? 'All rails reached high-tide refugia safely!'
                    : 'You guided the rails safely to high-tide refugia!',
                level: this.levelManager.currentLevel,
                victory: true,
            });
        });
    }

    showMarshFact(fact, onComplete) {
        const { width, height } = this.scale;
        const compact = height <= 520 || width < 650;
        this.isPaused = true;

        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
            .setDepth(100);

        const panelW = Math.min(680, width - 40);
        const panelH = compact ? 270 : 320;
        const panel = this.add.graphics().setDepth(101);
        panel.fillStyle(0x1a2a1a, 0.95);
        panel.fillRoundedRect(width / 2 - panelW / 2, height / 2 - panelH / 2, panelW, panelH, 20);
        panel.lineStyle(2, 0x27ae60);
        panel.strokeRoundedRect(width / 2 - panelW / 2, height / 2 - panelH / 2, panelW, panelH, 20);

        const leafL = this.add.image(width / 2 - (compact ? 100 : 140), height / 2 - panelH / 2 + 52, 'icon_leaf').setScale(1.5).setDepth(102);
        const title = this.add.text(width / 2, height / 2 - panelH / 2 + 52, 'MARSH FACT', {
            fontFamily: 'Outfit',
            fontSize: compact ? '28px' : '36px',
            fontStyle: 'bold',
            color: '#27ae60',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(102);
        const leafR = this.add.image(width / 2 + (compact ? 100 : 140), height / 2 - panelH / 2 + 52, 'icon_leaf').setScale(1.5).setDepth(102);

        const factText = this.add.text(width / 2, height / 2 + 10, fact, {
            fontFamily: 'Outfit',
            fontSize: compact ? '18px' : '24px',
            color: '#ffffff',
            wordWrap: { width: panelW - 70 },
            align: 'center',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(102);

        const continueText = this.add.text(width / 2, height / 2 + panelH / 2 - 45, 'Tap to continue...', {
            fontFamily: 'Outfit',
            fontSize: compact ? '16px' : '20px',
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

        if (this.railCallBgm && this.railCallBgm.isPlaying) {
            this.tweens.add({
                targets: this.railCallBgm,
                volume: 0,
                duration: 450,
                onComplete: () => {
                    if (this.railCallBgm) {
                        this.railCallBgm.stop();
                    }
                }
            });
        }

        const stats = this.scoreManager.getStats();

        // Transition to game over scene
        this.cameras.main.fadeOut(500);
        this.time.delayedCall(500, () => {
            this.scene.stop('UIScene');
            this.scene.start('GameOverScene', {
                stats,
                reason,
                level: this.levelManager.currentLevel,
                victory: false,
            });
        });
    }

    togglePause() {
        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.physics.pause();
            if (this.railCallBgm && this.railCallBgm.isPlaying) {
                this.railCallBgm.pause();
            }
        } else {
            this.physics.resume();
            if (this.railCallBgm && this.railCallBgm.isPaused) {
                this.railCallBgm.resume();
            }
        }

        // Notify UI
        this.events.emit('pauseToggle', this.isPaused);
    }

    connectUI() {
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
