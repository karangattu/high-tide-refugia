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
        // Single-level game: one tide event ("High Tide Rising") made of
        // escalating waves. Difficulty ramps per wave in startNextWave().
        return [
            {
                level: 1,
                name: 'High Tide Rising',
                waves: 8,
                railsPerWave: 5,
                catCount: 2,
                foxCount: 1,
                harrierCount: 1,
                waterSpeed: 6,
                railSpeedMultiplier: 0.7,
                seedRegen: 0.6,
                maxSeeds: 12,
                marshFact: 'Ridgway\'s Rails are secretive marsh birds that depend on dense vegetation for protection from predators.',
            },
        ];
    }

    getCurrentConfig() {
        return this.levels[0];
    }

    startLevel() {
        this.currentLevel = 1;
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
        // Escalate: +1 rail every 2 waves, extra predator pressure late
        this.railsToSpawn = config.railsPerWave + Math.floor((this.waveNumber - 1) / 2);

        return {
            waveNumber: this.waveNumber,
            railsToSpawn: this.railsToSpawn,
            shouldSpawnMouse: this.waveNumber % 3 === 0,
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
        return this.waveNumber >= config.waves;
    }

    advanceLevel() {
        // Single-level game: there is no next level.
        return this.getCurrentConfig();
    }

    getLevelProgress() {
        const config = this.getCurrentConfig();
        return {
            level: 1,
            levelName: config.name,
            wave: this.waveNumber,
            totalWaves: config.waves,
            railsSpawned: this.railsSpawned,
            railsToSpawn: this.railsToSpawn,
        };
    }
}
