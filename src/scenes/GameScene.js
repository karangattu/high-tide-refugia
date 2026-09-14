import Phaser from 'phaser';

const TEXT_RES = window.devicePixelRatio || 2;
import { Rail } from '../entities/Rail.js';
import { Plant, PlantPreview, getPlantTypeForX, getPlantZoneForX, PLANT_TYPES } from '../entities/Plant.js';
import { Wrack } from '../entities/Wrack.js';
import { Cat } from '../entities/predators/Cat.js';
import { Fox } from '../entities/predators/Fox.js';
import { Harrier } from '../entities/predators/Harrier.js';
import { ParticleManager } from '../effects/ParticleManager.js';
import { scheduleSaltMarshMouseRuns } from '../effects/SaltMarshMouseRun.js';
import { WaterSystem } from '../systems/WaterSystem.js';
import { SeedBank } from '../systems/SeedBank.js';
import { ScoreManager, computeCorridorConnectivity } from '../systems/ScoreManager.js';
import { LevelManager } from '../systems/LevelManager.js';
import { TutorialFlow, createTutorialPlantTargets } from '../systems/TutorialFlow.js';
import { FloatingSeeds } from '../systems/FloatingSeeds.js';
import { getRandomMarshFact } from '../data/marshFacts.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Game state
        this.isPaused = false;
        this.touchPlantPointer = null;
        this.waveStarting = false;
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.isGameOver = false;
        this.safeZoneX = width - 100;

        // The interactive tutorial runs at the start of every game so shared
        // devices always onboard each new player. Players can skip it.
        this.tutorialActive = false;
        this.tutorialAdvancing = false;
        this.tutorialComplete = false;
        this.tutorialElements = [];
        this.tutorialMarkers = [];
        this.tutorialRail = null;
        this.tutorialRefugeShown = false;
        this.tutorialHarrier = null;
        this.skipTutorialButton = null;
        this.levelStartElements = [];

        // Active-play state
        this.lastSeedTapTime = 0;
        this.rustleCooldownUntil = 0;


        // Initialize systems
        this.particleManager = new ParticleManager(this);
        this.scoreManager = new ScoreManager(this);
        this.seedBank = new SeedBank(this);
        this.levelManager = new LevelManager(this);
        this.floatingSeeds = new FloatingSeeds(this);

        // Create environment
        this.createEnvironment(width, height);

        // Create entity groups
        this.createEntityGroups();

        this.waterSystem = new WaterSystem(this, 50, this.marshY, height);

        this.corridorGraphics = this.add.graphics().setDepth(1);
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
        this.horizonY = Math.round(height * (portrait ? 0.12 : (isMobileLandscape ? 0.08 : 0.10)));
        this.marshY = Math.round(height * (portrait ? 0.20 : (isMobileLandscape ? 0.15 : 0.17)));
        const { horizonY, marshY } = this;
        const footerH = isMobileLandscape ? 34 : 50;
        this.marshTop = marshY + (isMobileLandscape ? 12 : 24);
        this.marshBottom = height - footerH - 45;

        const sky = this.add.graphics().setDepth(-30);
        sky.fillGradientStyle(0x1976d2, 0x1976d2, 0xffd54f, 0xffd54f, 1, 1, 1, 1);
        sky.fillRect(0, 0, width, horizonY + 2);

        const compactSun = isMobileLandscape || horizonY < 120;
        const sunX = width * 0.72;
        const sunY = compactSun ? horizonY * 0.65 : horizonY * 0.46;
        const sun = this.add.graphics().setDepth(-29);
        sun.setBlendMode(Phaser.BlendModes.ADD);

        if (isMobileLandscape || horizonY < 120) {
            sun.fillStyle(0xffa726, 0.25);
            sun.fillCircle(sunX, sunY, horizonY * 0.42);
            sun.fillStyle(0xfff59d, 0.75);
            sun.fillCircle(sunX, sunY, horizonY * 0.22);
            sun.fillStyle(0xffffff, 0.95);
            sun.fillCircle(sunX, sunY, horizonY * 0.10);
        } else {
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
        }

        const water = this.add.graphics().setDepth(-29);
        water.fillGradientStyle(0x1565c0, 0x1565c0, 0x00838f, 0x00838f, 1, 1, 1, 1);
        water.fillRect(0, horizonY, width, marshY - horizonY + 2);

        const refl = this.add.graphics().setDepth(-28);
        refl.setBlendMode(Phaser.BlendModes.ADD);
        const reflCount = compactSun ? 4 : 8;
        for (let i = 0; i < reflCount; i++) {
            const t = reflCount === 1 ? 0.5 : i / (reflCount - 1);
            const y = horizonY + 3 + t * Math.max(2, marshY - horizonY - 6);
            const w = (1 - t) * (compactSun ? 60 : 140) + 16;
            refl.fillStyle(0xffe082, 0.30 * (1 - t) + 0.08);
            refl.fillEllipse(
                sunX + Phaser.Math.Between(-8, 8), y,
                w, Phaser.Math.Between(2, 3)
            );
        }

        const shimmerCount = compactSun ? 5 : 14;
        for (let i = 0; i < shimmerCount; i++) {
            const y = Phaser.Math.Between(horizonY + 3, marshY - 3);
            const line = this.add.rectangle(
                Phaser.Math.Between(0, width), y,
                Phaser.Math.Between(16, compactSun ? 45 : 90), 2,
                0x9fd8e8, Phaser.Math.FloatBetween(0.10, 0.25)
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
            // Lean on mobile: thin out every other tuft so the left edge
            // stays a hint of cover instead of a wide wall.
            if (isMobileLandscape && i % 2 === 1) continue;
            const y = this.marshY + 10 + i * 20 + Phaser.Math.Between(-6, 6);
            let x = Phaser.Math.Between(15, 80);
            const scale = isMobileLandscape
                ? Phaser.Math.FloatBetween(0.15, 0.20)
                : Phaser.Math.FloatBetween(0.24, 0.32);
            if (isMobileLandscape) x = Math.min(x, 45);
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
        if (isMobileLandscape) {
            upland.fillRect(uplandX - 10, marshY, 40, height - marshY);
        } else {
            upland.fillRect(uplandX - 70, marshY, 100, height - marshY);
        }

        // Single vertical row of decorative gumplants down the upland
        // refuge — one fixed column so it reads as a border, not a thicket.
        const gumplantRowX = uplandX + (isMobileLandscape ? 75 : 55);
        const gumplantCount = Math.round((this.marshBottom - this.marshTop) / 20);
        for (let i = 0; i <= gumplantCount; i++) {
            // Lean on mobile: keep 1 in 3 bushes so the row stays airy.
            if (isMobileLandscape && i % 3 !== 0) continue;
            const y = this.marshTop + i * 20 + Phaser.Math.Between(-8, 8);
            const x = Phaser.Math.Clamp(
                gumplantRowX + Phaser.Math.Between(-8, 8),
                uplandX + 10,
                width - 25
            );
            const scale = isMobileLandscape
                ? Phaser.Math.FloatBetween(0.14, 0.18)
                : Phaser.Math.FloatBetween(0.26, 0.34);
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

        const glowW = isMobileLandscape ? 110 : 150;
        const glowX = isMobileLandscape ? width - 55 : width - 75;
        const safeZoneGlow = this.add.rectangle(
            glowX, (marshY + height) / 2,
            glowW, height - marshY,
            0x27ae60, 0.12
        );
        safeZoneGlow.setDepth(1);

        this.add.text(glowX, marshY + 22, 'SAFE REFUGE', {
            fontFamily: 'Mona Sans',
            fontSize: isMobileLandscape ? '14px' : '20px',
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

        // Temporary king-tide debris refugia
        this.wrack = this.add.group();

        // Plant preview
        this.plantPreview = new PlantPreview(this, 0, 0);
        this.plantPreview.setPlantType('cordgrass');
    }

    setupInput() {
        const aim = pointer => ({
            x: pointer.x,
            y: pointer.wasTouch ? pointer.y - 52 : pointer.y,
        });
        const preview = pointer => {
            const { x, y } = aim(pointer);
            this.plantPreview.setPlantType(getPlantTypeForX(x, this.scale.width));
            const reason = this.getPlacementFailure(x, y);
            this.plantPreview.show(x, y, !reason, reason);
        };
        this.input.on('pointermove', pointer => {
            if (this.isPaused || this.isGameOver) return;
            if (pointer.wasTouch && this.touchPlantPointer !== pointer.id) return;
            preview(pointer);
        });
        this.input.on('pointerdown', pointer => {
            if (this.isPaused || this.isGameOver) return;
            if (Date.now() - (this.lastSeedTapTime || 0) < 80) return;
            const target = aim(pointer);
            if (!this.isInMarsh(target.x, target.y)) return;
            if (pointer.wasTouch) {
                if (this.touchPlantPointer !== null) return;
                this.touchPlantPointer = pointer.id;
                preview(pointer);
                return;
            }
            const planted = this.tryPlantAt(pointer.x, pointer.y);
            if (!planted && !this.tutorialActive && this.seedBank.canPlant()) {
                this.rustleAt(pointer.x, pointer.y);
            }
        });
        this.input.on('pointerup', pointer => {
            if (this.touchPlantPointer !== pointer.id) return;
            this.touchPlantPointer = null;
            const { x, y } = aim(pointer);
            if (pointer.event?.type !== 'touchcancel' && !this.isPaused && !this.isGameOver && this.isInMarsh(x, y)) {
                this.tryPlantAt(x, y);
            }
            this.plantPreview.hide();
        });
        const cancel = () => {
            this.touchPlantPointer = null;
            this.plantPreview.hide();
        };
        this.input.on('pointerupoutside', cancel);
        this.input.on('gameout', cancel);
        this.input.on('pointerout', () => {
            if (this.touchPlantPointer === null) this.plantPreview.hide();
        });
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    }

    setupCollisions() {
        // Shelter uses the same circular areas as the corridor overlay and scoring.
        // Listen for rails caught. Remove any handler left over from a previous
        // game first, since the scene EventEmitter survives scene restarts.
        this.events.off('railCaught', this.onRailCaught, this);
        this.events.on('railCaught', this.onRailCaught, this);
    }

    onRailCaught(rail) {
        this.scoreManager.railLost(rail, 'predator');
    }

    getPlacementFailure(x, y) {
        if (this.tutorialActive) {
            if (!this.tutorialFlow?.findAvailableTarget(x, y)) return 'Aim at a glowing marker';
            return this.seedBank.canPlant() ? '' : 'Need seeds';
        }
        if (y < this.marshTop || y > this.marshBottom || x > this.scale.width - 150) return 'Plant inside the marsh';
        if (x < this.waterSystem.getWaterX(y) + 30) return 'Too close to the tide';
        if (this.plants.children.entries.some(p => Math.hypot(x - p.x, y - p.y) < 50)) return 'Too close to another plant';
        return this.seedBank.canPlant() ? '' : 'Need seeds';
    }

    canPlantAt(x, y) {
        return !this.getPlacementFailure(x, y);
    }

    tryPlantAt(x, y) {
        const reason = this.getPlacementFailure(x, y);
        if (reason) {
            this.plantPreview.setPlantType(getPlantTypeForX(x, this.scale.width));
            this.plantPreview.show(x, y, false, reason);
            this.events.emit('placementFeedback', reason);
            return false;
        }

        const tutorialTarget = this.tutorialActive
            ? this.tutorialFlow.claimTarget(x, y)
            : null;
        if (this.tutorialActive && !tutorialTarget) return false;

        // Spend seeds
        if (!this.seedBank.spendSeeds()) return false;

        if (tutorialTarget) {
            x = tutorialTarget.x;
            y = tutorialTarget.y;
        }

        const plantType = getPlantTypeForX(x, this.scale.width);
        const plant = new Plant(this, x, y, plantType);
        plant.isReplacement = this.plants.children.entries.some(p => p.submerged && !p.isCover()
            && p.x < x && x - p.x <= 200 && Math.abs(p.y - y) <= p.coverRadius + plant.coverRadius);
        this.plants.add(plant);
        this.scoreManager.recordPlantPlaced(plantType);

        if (tutorialTarget) this.onTutorialPlantPlaced(tutorialTarget);

        // Sound effect would go here
        return true;
    }

    /** Is this point inside the plantable marsh strip? */
    isInMarsh(x, y) {
        const { width } = this.scale;
        if (x < 40 || x > width - 150) return false;
        if (y < this.marshTop || y > this.marshBottom) return false;
        return true;
    }

    /**
     * Kick the vegetation to lure nearby ground predators away from the rail
     * route. On a short cooldown so it stays a timing tool, not a spam action.
     */
    rustleAt(x, y) {
        if (!this.isInMarsh(x, y)) return false;
        const now = this.waterSystem.elapsed;
        if (now < this.rustleCooldownUntil) return false;
        this.rustleCooldownUntil = now + 2000;

        this.particleManager.emitRustle(x, y);
        this.particleManager.emitScorePopup(x, y, 'RUSTLE!', '#9be29b');

        const lureRadius = 260;
        this.groundPredators.children.entries.forEach(predator => {
            const dist = Phaser.Math.Distance.Between(predator.x, predator.y, x, y);
            if (dist <= lureRadius && typeof predator.distractAt === 'function') {
                predator.distractAt(x, y, 1500);
            }
        });
        return true;
    }

    onSaltieTapped(mouse) {
        if (!mouse) return;
        this.scoreManager.addBonus(50, mouse.x, mouse.y, '');
        this.seedBank.addSeeds(1);
        this.particleManager.emitPlusOne(mouse.x, mouse.y, '+1 Salt Marsh Harvest Mouse spotted');
        this.particleManager.emitHearts(mouse.x, mouse.y);
        // Nearby predators take the bait and chase the mouse instead.
        this.groundPredators.children.entries.forEach(predator => {
            const dist = Phaser.Math.Distance.Between(predator.x, predator.y, mouse.x, mouse.y);
            if (dist <= 220 && typeof predator.distractAt === 'function') {
                predator.distractAt(mouse.x, mouse.y, 1500);
            }
        });
    }

    startLevel() {
        const config = this.levelManager.startLevel();

        // Reset water
        if (this.waterSystem) {
            this.waterSystem.reset();
            this.waterSystem.setSpeed(this.tutorialComplete ? config.waterSpeed : 0);
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

        if (!this.tutorialComplete) {
            this.spawnTutorialPredator();
            this.startTutorial();
            return;
        }

        this.launchFullGame(config);
    }

    launchFullGame(config) {
        this.rails.clear(true, true);
        this.plants.clear(true, true);
        this.groundPredators.clear(true, true);
        this.harriers.clear(true, true);
        this.scoreManager.reset();
        this.seedBank.reset();

        if (this.waterSystem) {
            this.waterSystem.reset();
            // Keep the preparation window comparable on narrow and wide screens.
            this.waterSystem.baseSpeed = Math.min(config.waterSpeed, (this.safeZoneX - 100) / 200);
            this.waterSystem.setSpeed(this.waterSystem.baseSpeed);
        }

        this.waveStarting = true;

        this.kingTideTriggered = false;
        if (config.isKingTide) {
            this.time.delayedCall(3000, () => this.triggerKingTideEvent());
        }

        this.showLevelStart(config, () => {
            this.waveStarting = false;
            this.beginNextWave();
            scheduleSaltMarshMouseRuns(this);
        });
    }

    spawnTutorialPredator() {
        const { width } = this.scale;
        const laneY = (this.marshTop + this.marshBottom) / 2;
        const patrolMin = Math.max(120, width * 0.38);
        const patrolMax = Math.max(patrolMin + 120, Math.min(width - 90, width * 0.78));
        const cat = new Cat(this, (patrolMin + patrolMax) / 2, laneY, patrolMin, patrolMax);
        cat.catchDistance = -1;
        cat.visionRange = 120;
        cat.chaseSpeed = 170;
        this.groundPredators.add(cat);
        this.tutorialPredator = cat;
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
            if (config.catVisionRange) cat.visionRange = config.catVisionRange;
            if (config.catChaseSpeed) cat.chaseSpeed = config.catChaseSpeed;
            this.groundPredators.add(cat);
        }

        const foxCount = config.foxCount !== undefined ? config.foxCount : 1;
        for (let i = 0; i < foxCount; i++) {
            const startX = zoneStart + 80 + i * 220;
            const startY = top + ((bottom - top) * (0.35 + i * 0.3));
            const fox = new Fox(this, startX, startY);
            this.groundPredators.add(fox);
        }

        // Spawn harriers
        for (let i = 0; i < config.harrierCount; i++) {
            const harrier = new Harrier(this, 200 + i * 300, (top + bottom) / 2);
            harrier.minY = top;
            harrier.maxY = bottom;
            this.harriers.add(harrier);
        }
    }

    triggerKingTideEvent() {
        if (this.kingTideTriggered && this.waterSystem?.isKingTide) return;
        this.kingTideTriggered = true;
        if (this.waterSystem) this.waterSystem.triggerKingTide();
        this.time.delayedCall(900, () => this.spawnKingTideWrack());
    }

    /**
     * King Tide floods the marsh with floating wrack. These mats drift in with
     * the surge and give rails a few seconds of emergency cover before sinking.
     */
    spawnKingTideWrack() {
        const { width } = this.scale;
        const count = 3;
        for (let i = 0; i < count; i++) {
            const y = Phaser.Math.Between(this.marshTop + 30, this.marshBottom - 20);
            const startX = 30 + Phaser.Math.Between(0, 60);
            const mat = new Wrack(this, startX, y);
            this.wrack.add(mat);

            const travel = (width - 170) - startX;
            mat.scene.tweens.add({
                targets: mat,
                x: startX + travel * Phaser.Math.FloatBetween(0.55, 0.85),
                y: y + Phaser.Math.Between(-30, 30),
                duration: Phaser.Math.Between(7000, 10000),
                ease: 'Sine.easeInOut',
                onComplete: () => this.sinkWrack(mat),
            });
            this.tweens.add({
                targets: mat,
                alpha: { from: 0.15, to: 1 },
                duration: 700,
            });
        }
    }

    sinkWrack(mat) {
        if (!mat || !mat.active) return;
        this.tweens.add({
            targets: mat,
            alpha: 0,
            y: mat.y + 12,
            duration: 600,
            onComplete: () => {
                this.wrack.remove(mat, true, true);
            },
        });
    }

    showLevelStart(config, onComplete = null) {
        const { width, height } = this.scale;
        const compact = height <= 520 || width < 650;
        const bandY = (this.marshY + height) / 2;

        if (this.levelStartElements) {
            this.levelStartElements.forEach(el => el.destroy());
        }

        const levelText = this.add.text(width / 2, bandY - 60,
            config.name.toUpperCase(), {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '56px' : '84px',
            fontStyle: 'bold',
            color: '#f39c12',
            stroke: '#000000',
            strokeThickness: compact ? 6 : 9,
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(100);

        const nameText = this.add.text(width / 2, bandY + 30,
            'Survive the rising tide', {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '28px' : '40px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(100);

        this.levelStartElements = [levelText, nameText];

        this.tweens.add({
            targets: [levelText, nameText],
            alpha: { from: 0, to: 1 },
            scale: { from: 0.5, to: 1 },
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: [levelText, nameText],
                    alpha: 0,
                    y: '-=50',
                    delay: 1800,
                    duration: 500,
                    onComplete: () => {
                        levelText.destroy();
                        nameText.destroy();
                        this.levelStartElements = [];
                        if (onComplete) onComplete();
                    }
                });
            }
        });
    }

    startTutorial() {
        this.tutorialActive = true;
        this.tutorialAdvancing = false;
        this.tutorialRefugeShown = false;

        const waterX = this.waterSystem ? this.waterSystem.getWaterX() : 50;
        const left = Math.max(waterX + 80, 110);
        const right = Math.max(left + 220, this.scale.width - 190);
        this.tutorialLaneY = (this.marshTop + this.marshBottom) / 2;
        this.tutorialFlow = new TutorialFlow(
            createTutorialPlantTargets(left, right, this.tutorialLaneY, 5)
        );

        this.createZonationGuide();
        this.createSkipTutorialButton();

        this.setTutorialMessage(
            'WATCH THE PREDATOR',
            'This roaming cat can spot exposed Ridgway\'s Rails.'
        );

        this.time.delayedCall(2200, () => {
            if (this.tutorialActive && this.tutorialFlow?.stage === 'observe') {
                this.beginTutorialPlanting();
            }
        });
    }

    /**
     * A colour-coded elevation legend for the tutorial: low marsh mudflat on
     * the left shades up through the marsh plain into the upland refugia on the
     * right. Each band names the native species that grows at that elevation.
     */
    createZonationGuide() {
        const { width } = this.scale;
        const minX = 60;
        const maxX = Math.max(minX + 100, width - 150);
        const bandW = (maxX - minX) / PLANT_TYPES.length;
        const bandY = this.marshBottom - 8;
        const colors = [0x6b8f3a, 0x8a9a3a, 0xa8a83f, 0xb0a04a, 0x5d8a3a];

        const strip = this.add.graphics().setDepth(9).setAlpha(0.85);
        strip.fillStyle(0x07150c, 0.55);
        strip.fillRoundedRect(minX - 4, bandY - 13, maxX - minX + 8, 22, 5);

        PLANT_TYPES.forEach((plant, i) => {
            const bx = minX + i * bandW;
            strip.fillStyle(colors[i], 0.5);
            strip.fillRect(bx, bandY - 11, bandW - 2, 5);

            const label = this.add.text(bx + bandW / 2, bandY + 4, plant.label, {
                fontFamily: 'Mona Sans',
                fontSize: '10px',
                fontStyle: 'bold',
                color: '#eef7f2',
                resolution: TEXT_RES,
            }).setOrigin(0.5).setDepth(10);

            this.tutorialElements.push(label);
        });
        this.tutorialElements.push(strip);

        const arrow = this.add.text(
            (minX + maxX) / 2, bandY - 24,
            'LOW MARSH  →  UPLAND REFUGIA', {
            fontFamily: 'Mona Sans',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#9be29b',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(10);
        this.tutorialElements.push(arrow);
    }

    createSkipTutorialButton() {
        const { width, height } = this.scale;
        const compact = height <= 520 || width < 650;
        const w = compact ? 132 : 172;
        const h = compact ? 34 : 40;
        const x = width - w / 2 - (compact ? 10 : 16);
        const y = height - (compact ? 56 : 76);

        const bg = this.add.graphics().setDepth(95);
        const draw = (hover = false) => {
            bg.clear();
            bg.fillStyle(0x07150c, hover ? 0.95 : 0.82);
            bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
            bg.lineStyle(1.5, hover ? 0xffffff : 0xf39c12, hover ? 0.95 : 0.7);
            bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
        };
        draw();

        const label = this.add.text(x, y, 'SKIP TUTORIAL', {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '12px' : '14px',
            fontStyle: 'bold',
            color: '#ffffff',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(96);

        const hit = this.add.rectangle(x, y, w, h, 0xffffff, 0)
            .setDepth(97)
            .setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => draw(true));
        hit.on('pointerout', () => draw(false));
        hit.on('pointerdown', () => this.skipTutorial());

        this.skipTutorialButton = [bg, label, hit];
    }

    skipTutorial() {
        if (!this.tutorialActive) return;
        this.finishTutorial();
    }

    setTutorialMessage(title, subtitle, color = '#f39c12') {
        const { width, height } = this.scale;
        const compact = height <= 520 || width < 650;
        const panelW = Math.min(compact ? 570 : 700, width - 30);
        const panelH = compact ? 66 : 82;
        const panelY = this.marshTop + panelH / 2 + (compact ? 4 : 10);

        if (!this.tutorialMessagePanel) {
            const panel = this.add.graphics().setDepth(90);
            panel.fillStyle(0x07150c, 0.88);
            panel.fillRoundedRect(width / 2 - panelW / 2, panelY - panelH / 2, panelW, panelH, 14);
            panel.lineStyle(1.5, 0xf39c12, 0.65);
            panel.strokeRoundedRect(width / 2 - panelW / 2, panelY - panelH / 2, panelW, panelH, 14);

            const heading = this.add.text(width / 2, panelY - (compact ? 12 : 16), title, {
                fontFamily: 'Mona Sans',
                fontSize: compact ? '18px' : '24px',
                fontStyle: 'bold',
                color,
                resolution: TEXT_RES,
            }).setOrigin(0.5).setDepth(91);

            const detail = this.add.text(width / 2, panelY + (compact ? 13 : 17), subtitle, {
                fontFamily: 'Mona Sans',
                fontSize: compact ? '12px' : '16px',
                color: '#ffffff',
                wordWrap: { width: panelW - 28 },
                align: 'center',
                resolution: TEXT_RES,
            }).setOrigin(0.5).setDepth(91);

            this.tutorialMessagePanel = panel;
            this.tutorialHeading = heading;
            this.tutorialDetail = detail;
            this.tutorialElements.push(panel, heading, detail);
            return;
        }

        this.tutorialHeading.setText(title).setColor(color);
        this.tutorialDetail.setText(subtitle);
    }

    beginTutorialPlanting() {
        this.tutorialFlow.beginPlanting();
        this.setTutorialMessage(
            'PLANT 5 REFUGE PATCHES · 0/5',
            'Every elevation grows a different species — from Cordgrass at the water to Gumplant in the refugia.'
        );

        this.tutorialMarkers = this.tutorialFlow.targets.map(target => {
            const marker = this.add.circle(target.x, target.y, 25, 0x2ecc71, 0.18)
                .setStrokeStyle(3, 0x7dffad, 0.95)
                .setDepth(12);
            this.tweens.add({
                targets: marker,
                scaleX: { from: 0.86, to: 1.16 },
                scaleY: { from: 0.86, to: 1.16 },
                alpha: { from: 0.65, to: 1 },
                duration: 700,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });

            const zone = getPlantZoneForX(target.x, this.scale.width);
            const badge = this.add.text(target.x, target.y - 34, `${zone.label} · ${zone.zone}`, {
                fontFamily: 'Mona Sans',
                fontSize: '10px',
                fontStyle: 'bold',
                color: '#f1c40f',
                stroke: '#07150c',
                strokeThickness: 3,
                resolution: TEXT_RES,
            }).setOrigin(0.5).setDepth(13);
            this.tutorialElements.push(badge);

            return { id: target.id, marker, badge };
        });
    }

    onTutorialPlantPlaced(target) {
        const markerEntry = this.tutorialMarkers.find(entry => entry.id === target.id);
        if (markerEntry?.marker) {
            this.tweens.killTweensOf(markerEntry.marker);
            markerEntry.marker.destroy();
        }
        if (markerEntry?.badge?.active) markerEntry.badge.destroy();

        const placed = this.tutorialFlow.placements;
        if (this.tutorialFlow.stage === 'plant') {
            this.setTutorialMessage(
                `PLANT 5 REFUGE PATCHES · ${placed}/5`,
                'Keep the patches spaced along the highlighted rail route.'
            );
            return;
        }

        this.clearTutorialMarkers();
        this.beginTutorialTideDemo();
    }

    clearTutorialMarkers() {
        this.tutorialMarkers.forEach(entry => {
            if (entry.marker?.active) {
                this.tweens.killTweensOf(entry.marker);
                entry.marker.destroy();
            }
            if (entry.badge?.active) entry.badge.destroy();
        });
        this.tutorialMarkers = [];
    }

    /**
     * Brief scripted surge that shows the waterline creeping over the low
     * marsh, then draining back: the reason rails need a route to the uplands.
     */
    beginTutorialTideDemo() {
        this.setTutorialMessage(
            'THE TIDE IS RISING',
            'Low-marsh cover floods first. Build a continuous chain toward the upland refugia before the water arrives.'
        );

        const ws = this.waterSystem;
        if (!ws) {
            this.beginRefugeDemonstration();
            return;
        }
        const startX = ws.currentX;
        const lowMarshX = startX + 140;

        this.tweens.add({
            targets: ws,
            currentX: lowMarshX,
            duration: 2400,
            ease: 'Sine.easeIn',
            onComplete: () => {
                if (!this.tutorialActive) return;
                this.particleManager.emitWaterSplash(lowMarshX, this.tutorialLaneY);
                this.time.delayedCall(700, () => {
                    if (!this.tutorialActive) return;
                    this.tweens.add({
                        targets: ws,
                        currentX: startX,
                        duration: 1500,
                        ease: 'Sine.easeOut',
                        onComplete: () => {
                            if (this.tutorialActive) this.beginRefugeDemonstration();
                        },
                    });
                });
            },
        });
    }

    beginRefugeDemonstration() {
        this.clearTutorialMarkers();
        this.spawnTutorialHarrier();

        this.time.delayedCall(2800, () => {
            if (!this.tutorialActive) return;
            if (this.tutorialHarrier?.active) {
                this.tutorialHarrier.destroy();
            }
            this.tutorialHarrier = null;
            this.setTutorialMessage(
                'WATCH THE REFUGE WORK',
                'The rail becomes hidden whenever it ducks into vegetation.'
            );
            this.time.delayedCall(600, () => this.spawnTutorialRail());
        });
    }

    spawnTutorialHarrier() {
        const top = this.marshTop + 30;
        const bottom = this.marshBottom - 30;
        const harrier = new Harrier(this, this.scale.width * 0.42, (top + bottom) / 2);
        harrier.harmless = true;
        harrier.minY = top;
        harrier.maxY = bottom;
        this.harriers.add(harrier);
        this.tutorialHarrier = harrier;

        this.setTutorialMessage(
            'THE NORTHERN HARRIER',
            'That circular ground shadow marks its dive zone. Cover is life-saving — against ground and aerial hunters alike.'
        );
    }

    spawnTutorialRail() {
        if (!this.tutorialActive || this.tutorialFlow?.stage !== 'demonstrate') return;
        const waterX = this.waterSystem ? this.waterSystem.getWaterX(this.tutorialLaneY) : 50;
        const rail = new Rail(this, Math.max(35, waterX + 35), this.tutorialLaneY, 1);
        rail.baseSpeed = 105;
        rail._speedX = 105;
        rail.wobbleAmp = 1;
        rail.wobbleFreq = 0;
        rail.wobbleOffset = 0;
        this.rails.add(rail);
        this.tutorialRail = rail;
    }

    showTutorialRefugeFeedback(rail) {
        if (this.tutorialRefugeShown) return;
        this.tutorialRefugeShown = true;
        this.setTutorialMessage(
            'SAFE IN THE REFUGE!',
            'The cat loses sight of the rail while it is under plant cover.',
            '#2ecc71'
        );
        this.particleManager.emitScorePopup(rail.x, rail.y, 'HIDDEN!', '#2ecc71');
    }

    completeTutorial() {
        if (this.tutorialAdvancing || !this.tutorialFlow?.completeDemonstration()) return;
        this.tutorialAdvancing = true;
        this.setTutorialMessage(
            'REFUGE CREATED!',
            'Now use a few well-placed patches to protect rails during the rising tide.',
            '#2ecc71'
        );

        this.time.delayedCall(1800, () => this.finishTutorial());
    }

    finishTutorial() {
        this.tutorialActive = false;
        this.tutorialComplete = true;

        // Stop any in-flight scripted tide demo before the real tide starts.
        if (this.tweens && this.waterSystem) {
            this.tweens.killTweensOf(this.waterSystem);
        }

        this.tutorialElements.forEach(element => element?.destroy());
        this.tutorialElements = [];
        this.clearTutorialMarkers();
        if (this.tutorialHarrier?.active) this.tutorialHarrier.destroy();
        this.tutorialHarrier = null;
        if (this.skipTutorialButton) {
            this.skipTutorialButton.forEach(element => element?.destroy());
            this.skipTutorialButton = null;
        }
        this.tutorialMessagePanel = null;
        this.tutorialHeading = null;
        this.tutorialDetail = null;
        this.tutorialRail = null;
        this.tutorialFlow = null;

        this.tutorialAdvancing = false;
        this.launchFullGame(this.levelManager.getCurrentConfig());
    }

    beginNextWave() {
        this.levelManager.startNextWave();
        const profile = this.levelManager.getWaveProfile();
        this.seedBank.setRegenRate(profile.regen);
        this.groundPredators.clear(true, true);
        this.harriers.clear(true, true);
        this.spawnPredators({ catCount: profile.cats, foxCount: profile.foxes, harrierCount: profile.harriers });
        this.spawnTimer = -2000;
        this.spawnInterval = profile.interval[0];
        if (this.levelManager.waveNumber === 8) this.triggerKingTideEvent();
    }

    spawnRail() {
        const profile = this.levelManager.getWaveProfile();
        const lane = profile.lane === 'alternating'
            ? (this.levelManager.railsSpawned % 2 ? 0.75 : 0.25) : 0.5;
        const y = Phaser.Math.Clamp(this.marshTop + (this.marshBottom - this.marshTop) * lane
            + Phaser.Math.Between(-14, 14), this.marshTop, this.marshBottom);
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

        if (this.waveStarting) return;
        this.waterSystem.update(delta);
        this.seedBank.update(delta);

        this.groundPredators.children.entries.forEach(predator => {
            predator.update(time, delta, this.rails);
        });

        this.harriers.children.entries.forEach(harrier => {
            harrier.update(time, delta, this.rails, this.plants);
        });

        this.updatePlantWaterState();

        this.checkWaterCollisions();

        this.checkSafeZone();

        this.updateCorridorStatus();
        this.updateRailPlantOverlaps();
        this.updateSpawning(delta);

        this.checkGameState();
    }

    updatePlantWaterState() {
        const time = this.waterSystem.elapsed;
        this.plants.children.entries.forEach(plant => {
            const waterX = this.waterSystem.getWaterX(plant.y);
            plant.updateWater(waterX, time);
        });
    }

    /** Keep the Green Corridor bonus live as the habitat grows. */
    updateCorridorStatus() {
        const status = this.getCorridorStatus();
        this.corridorStatus = status;
        this.scoreManager.setCorridorStatus(status);
        const g = this.corridorGraphics;
        g.clear();
        g.lineStyle(1, 0xb7e9cc, 0.25);
        for (const p of this.plants.children.entries.filter(p => p.isCover())) g.strokeCircle(p.x, p.y, p.coverRadius);
        if (status.connected) {
            g.lineStyle(3, 0x80efab, 0.65);
            g.beginPath();
            g.moveTo(this.waterSystem.getWaterX() + 30, status.path[0].y);
            for (const p of status.path) g.lineTo(p.x, p.y);
            g.lineTo(this.safeZoneX, status.path.at(-1).y);
            g.strokePath();
        }
    }

    getCorridorStatus() {
        const waterX = this.waterSystem ? this.waterSystem.getWaterX() : 50;
        const plants = this.plants.children.entries
            .filter(plant => plant.isCover && plant.isCover());
        return computeCorridorConnectivity(plants, {
            fromX: waterX + 30,
            toX: this.safeZoneX,
        });
    }

    checkWaterCollisions() {
        const time = this.waterSystem.elapsed;
        this.rails.children.entries.forEach(rail => {
            if (!rail.isAlive) return;
            const waterXAtY = this.waterSystem.getWaterX(rail.y);
            if (rail.x >= waterXAtY + 12) return;

            // Water-resistant Cordgrass buys a few seconds of shelter before
            // the tide sweeps a rail out of the low marsh.
            const sheltered = this.plants.children.entries.some(plant => {
                if (plant.plantType !== 'cordgrass' || !plant.submerged) return false;
                if ((time - plant.submergedAt) >= plant.traits.waterGrace) return false;
                return Phaser.Math.Distance.Between(rail.x, rail.y, plant.x, plant.y)
                    < plant.getCoverRadius();
            });
            if (sheltered) return;

            rail.die('water');
            this.scoreManager.railLost(rail, 'water');
            this.particleManager.emitWaterSplash(rail.x, rail.y);
        });
    }

    checkSafeZone() {
        this.rails.children.entries.forEach(rail => {
            if (rail.isAlive && !rail.hasReachedSafety && rail.x >= this.safeZoneX) {
                rail.reachSafety();
                if (this.tutorialActive && rail === this.tutorialRail) {
                    if (rail.hasUsedCover) {
                        this.completeTutorial();
                    } else {
                        this.tutorialRail = null;
                        this.setTutorialMessage(
                            'LET\'S WATCH AGAIN',
                            'The rail will follow the same route through your refuge patches.'
                        );
                        this.time.delayedCall(900, () => this.spawnTutorialRail());
                    }
                    return;
                }
                this.scoreManager.railSaved(rail);
            }
        });
    }

    updateRailPlantOverlaps() {
        // Use precisely the shelter circles shown in the marsh.
        const corridor = this.corridorStatus || this.getCorridorStatus();
        this.rails.children.entries.forEach(rail => {
            if (!rail.isAlive) return;

            let isOverlappingPlant = false;

            this.plants.children.entries.forEach(plant => {
                const distance = Phaser.Math.Distance.Between(rail.x, rail.y, plant.x, plant.y);
                const radius = plant.getCoverRadius ? plant.getCoverRadius() : 35;
                // Young sprouts are too small to hide a rail; Gumplant hides over a wider area.
                if (distance <= radius && plant.isCover && plant.isCover()) {
                    isOverlappingPlant = true;
                    if (corridor.path.includes(plant)) rail.hasUsedCorridor = true;
                    if (plant.isReplacement) rail.hasUsedReplacement = true;
                    if (!rail.isSafe) {
                        rail.enterPlant();
                    }

                }
            });

            // King-tide wrack mats act as temporary floating stepping stones.
            this.wrack.children.entries.forEach(mat => {
                if (isOverlappingPlant) return;
                const distance = Phaser.Math.Distance.Between(rail.x, rail.y, mat.x, mat.y);
                const radius = mat.coverRadius || 48;
                if (distance < radius) {
                    isOverlappingPlant = true;
                    if (!rail.isSafe) {
                        rail.enterPlant();
                    }

                }
            });

            if (!isOverlappingPlant && rail.isSafe) {
                rail.exitPlant();
            }

            if (isOverlappingPlant && rail.lastCoverPosition) {
                rail.coveredDistance += Math.max(0, rail.x - rail.lastCoverPosition.x);
            }
            rail.lastCoverPosition = isOverlappingPlant ? { x: rail.x, y: rail.y } : null;
            if (this.tutorialActive && rail === this.tutorialRail && rail.isSafe) {
                this.showTutorialRefugeFeedback(rail);
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
                    this.beginNextWave();
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
            const profile = this.levelManager.getWaveProfile();
            this.spawnInterval = profile.paired
                ? profile.interval[this.levelManager.railsSpawned % 2 ? 0 : 1]
                : Phaser.Math.Between(...profile.interval);
        }
    }

    checkGameState() {
        // Don't end game during tutorial
        if (this.tutorialActive) return;

        const waterX = this.waterSystem.getWaterX();
        const stats = this.scoreManager.getStats();

        // Game over if too many rails are lost
        if (stats.railsLost > 6) {
            this.gameOver('Too many rails were lost to predators or flooding.');
            return;
        }

        // Game over if water reaches safe zone
        if (waterX >= this.safeZoneX - 50) {
            this.gameOver('The king tide submerged the safe refuge.');
        }
    }

    completeLevel() {
        const fact = getRandomMarshFact();
        this.showMarshFact(fact, () => {
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
                habitat: this.buildHabitatSummary(),
            });
        });
    }

    buildHabitatSummary() {
        const stats = this.scoreManager.getStats();
        const corridor = this.corridorStatus || this.getCorridorStatus();
        return {
            speciesCount: stats.speciesCount,
            speciesTotal: PLANT_TYPES.length,
            speciesPlanted: stats.speciesPlanted,
            corridorGrade: corridor.grade,
            corridorConnected: corridor.connected,
            corridorMaxGap: corridor.maxGap,
            tideSurvivalRate: stats.tideSurvivalRate,
            waterDeaths: stats.waterDeaths,
            predatorDeaths: stats.predatorDeaths,
            plantsPlaced: stats.plantsPlaced,
        };
    }

    showMarshFact(factData, onComplete) {
        const { width, height } = this.scale;
        const compact = height <= 520 || width < 650;
        this.isPaused = true;

        const isObj = typeof factData === 'object' && factData !== null;
        const species = isObj && factData.species ? factData.species : null;
        const headline = isObj && factData.headline ? factData.headline : null;
        const text = isObj && factData.fact ? factData.fact : (typeof factData === 'string' ? factData : '');

        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
            .setDepth(100);

        const panelW = Math.min(680, width - 40);
        const panelH = compact ? 290 : 340;
        const panel = this.add.graphics().setDepth(101);
        panel.fillStyle(0x1a2a1a, 0.95);
        panel.fillRoundedRect(width / 2 - panelW / 2, height / 2 - panelH / 2, panelW, panelH, 20);
        panel.lineStyle(2, 0x27ae60);
        panel.strokeRoundedRect(width / 2 - panelW / 2, height / 2 - panelH / 2, panelW, panelH, 20);

        const leafL = this.add.image(width / 2 - (compact ? 110 : 150), height / 2 - panelH / 2 + 42, 'icon_leaf').setScale(compact ? 1.2 : 1.4).setDepth(102);
        const title = this.add.text(width / 2, height / 2 - panelH / 2 + 42, 'MARSH FACT', {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '24px' : '30px',
            fontStyle: 'bold',
            color: '#27ae60',
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(102);
        const leafR = this.add.image(width / 2 + (compact ? 110 : 150), height / 2 - panelH / 2 + 42, 'icon_leaf').setScale(compact ? 1.2 : 1.4).setDepth(102);

        let subTitleText = null;
        if (species || headline) {
            const subStr = species && headline ? `${species.toUpperCase()} · ${headline}` : (species || headline);
            subTitleText = this.add.text(width / 2, height / 2 - panelH / 2 + (compact ? 74 : 84), subStr, {
                fontFamily: 'Mona Sans',
                fontSize: compact ? '13px' : '15px',
                fontStyle: 'bold',
                color: '#f1c40f',
                resolution: TEXT_RES,
            }).setOrigin(0.5).setDepth(102);
        }

        const factY = subTitleText ? height / 2 + (compact ? 14 : 18) : height / 2 + 10;
        const factText = this.add.text(width / 2, factY, text, {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '15px' : '19px',
            color: '#ffffff',
            wordWrap: { width: panelW - 70 },
            align: 'center',
            lineSpacing: compact ? 3 : 5,
            resolution: TEXT_RES,
        }).setOrigin(0.5).setDepth(102);

        const continueText = this.add.text(width / 2, height / 2 + panelH / 2 - (compact ? 28 : 34), 'Tap to continue...', {
            fontFamily: 'Mona Sans',
            fontSize: compact ? '14px' : '17px',
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
                if (subTitleText) subTitleText.destroy();
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
                habitat: this.buildHabitatSummary(),
            });
        });
    }

    togglePause() {
        if (this.isGameOver) return;
        this.touchPlantPointer = null;
        this.plantPreview.hide();
        this.isPaused = !this.isPaused;

        this.time.paused = this.isPaused;
        if (this.isPaused) {
            this.tweens.pauseAll();
            this.physics.pause();
            if (this.railCallBgm && this.railCallBgm.isPlaying) {
                this.railCallBgm.pause();
            }
        } else {
            this.tweens.resumeAll();
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
