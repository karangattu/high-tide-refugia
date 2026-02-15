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
            // Level 1: Tutorial - Just one fox
            {
                level: 1,
                name: 'First Light',
                waves: 3,
                railsPerWave: 5,
                foxCount: 1,
                catCount: 0,
                harrierCount: 0,
                waterSpeed: 6,
                seedRegen: 0.6,
                maxSeeds: 12,
                marshFact: 'Ridgway\'s Rails are secretive marsh birds that depend on dense vegetation for protection from predators.',
            },
            // Level 2: Add a cat
            {
                level: 2,
                name: 'Rising Concern',
                waves: 4,
                railsPerWave: 6,
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
                waves: 4,
                railsPerWave: 7,
                foxCount: 1,
                catCount: 1,
                harrierCount: 1,
                waterSpeed: 10,
                seedRegen: 0.5,
                maxSeeds: 14,
                marshFact: 'Northern Harriers are skilled predators that hunt by flying low over marshes, surprising their prey.',
            },
            // Level 4: More pressure
            {
                level: 4,
                name: 'Mounting Odds',
                waves: 5,
                railsPerWave: 8,
                foxCount: 2,
                catCount: 1,
                harrierCount: 1,
                waterSpeed: 12,
                seedRegen: 0.6,
                maxSeeds: 16,
                marshFact: 'Planting native vegetation like Gumplant creates corridors that help wildlife move safely.',
            },
            // Level 5: King Tide!
            {
                level: 5,
                name: 'KING TIDE',
                waves: 6,
                railsPerWave: 10,
                foxCount: 2,
                catCount: 2,
                harrierCount: 2,
                waterSpeed: 18,
                seedRegen: 0.7,
                maxSeeds: 18,
                isKingTide: true,
                marshFact: 'King Tides are extreme high tides that flood marshes completely, forcing wildlife into exposed upland areas.',
            },
            // Endless survival after level 5
            {
                level: 6,
                name: 'Survival',
                waves: -1, // Endless
                railsPerWave: 12,
                foxCount: 3,
                catCount: 2,
                harrierCount: 2,
                waterSpeed: 20,
                seedRegen: 0.8,
                maxSeeds: 20,
                isKingTide: true,
                marshFact: 'Conservation efforts to restore marsh habitat help Ridgway\'s Rails survive in a changing climate.',
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
