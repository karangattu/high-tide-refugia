export class LevelManager {
    constructor(scene) {
        this.scene = scene;
        this.currentLevel = 1;
        this.waveNumber = 0;
        this.railsToSpawn = 0;
        this.railsSpawned = 0;

        this.levels = this.createLevels();
    }

    createLevels() {
        return [
            // Level 1: Tutorial - Just one cat (slow pace for learning)
            {
                level: 1,
                name: 'First Light',
                waves: 1,
                railsPerWave: 4,
                foxCount: 0,
                catCount: 1,
                harrierCount: 0,
                waterSpeed: 3,
                railSpeedMultiplier: 0.5,
                seedRegen: 0.6,
                maxSeeds: 12,
                marshFact: 'Ridgway\'s Rails are secretive marsh birds that depend on dense vegetation for protection from predators.',
            },
            // Level 2: Introduce a fox
            {
                level: 2,
                name: 'Rising Concern',
                waves: 2,
                railsPerWave: 5,
                foxCount: 1,
                catCount: 1,
                harrierCount: 0,
                waterSpeed: 8,
                seedRegen: 0.5,
                maxSeeds: 12,
                marshFact: 'Transition zones between marsh and upland are critical refuges during extreme high tides.',
            },
            // Level 3: Introduce harrier
            {
                level: 3,
                name: 'Eyes Above',
                waves: 2,
                railsPerWave: 6,
                foxCount: 1,
                catCount: 1,
                harrierCount: 1,
                waterSpeed: 10,
                seedRegen: 0.5,
                maxSeeds: 14,
                marshFact: 'Northern Harriers are skilled predators that hunt by flying low over marshes, surprising their prey.',
            },
        ];
    }

    getCurrentConfig() {
        const index = Math.min(this.currentLevel - 1, this.levels.length - 1);
        return this.levels[index];
    }

    startLevel(levelNumber) {
        this.currentLevel = levelNumber;
        this.waveNumber = 0;
        this.railsSpawned = 0;

        const config = this.getCurrentConfig();
        this.railsToSpawn = config.railsPerWave;

        return config;
    }

    startNextWave() {
        const config = this.getCurrentConfig();
        this.waveNumber++;
        this.railsSpawned = 0;
        this.railsToSpawn = config.railsPerWave;

        // Endless mode - increase difficulty each wave
        if (config.waves === -1) {
            this.railsToSpawn += Math.floor(this.waveNumber / 2);
        }

        return {
            waveNumber: this.waveNumber,
            railsToSpawn: this.railsToSpawn,
            isLevelComplete: false,
        };
    }

    recordRailSpawned() {
        this.railsSpawned++;
        return this.railsSpawned >= this.railsToSpawn;
    }

    isWaveComplete() {
        return this.railsSpawned >= this.railsToSpawn;
    }

    isLevelComplete() {
        const config = this.getCurrentConfig();
        if (config.waves === -1) return false; // Endless
        return this.waveNumber >= config.waves;
    }

    advanceLevel() {
        this.currentLevel++;
        return this.startLevel(this.currentLevel);
    }

    getLevelProgress() {
        const config = this.getCurrentConfig();
        return {
            level: this.currentLevel,
            levelName: config.name,
            wave: this.waveNumber,
            totalWaves: config.waves,
            railsSpawned: this.railsSpawned,
            railsToSpawn: this.railsToSpawn,
        };
    }
}
