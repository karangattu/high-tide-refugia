export const WAVE_PROFILES = [
    { name: 'First crossing', hint: 'Build shelter along the middle lane', lane: 'middle', interval: [2000, 2400], cats: 0, foxes: 0, harriers: 0, regen: 0.6 },
    { name: 'Scattered arrivals', hint: 'Cover the upper and lower marsh', lane: 'alternating', interval: [1900, 2300], cats: 1, catVisionRange: 110, catChaseSpeed: 220, foxes: 0, harriers: 0, regen: 0.6 },
    { name: 'Fox patrol', hint: 'Dense cover protects against ground hunters', lane: 'middle', interval: [1900, 2300], cats: 1, foxes: 1, harriers: 0, regen: 0.6 },
    { name: 'Flock rush', hint: 'Rails arrive in pairs — prepare connected shelter', lane: 'middle', interval: [1200, 2600], cats: 1, foxes: 1, harriers: 0, regen: 0.6, paired: true },
    { name: 'Lean season', hint: 'Seeds regrow slowly — collect floating pods', lane: 'middle', interval: [2100, 2500], cats: 1, foxes: 1, harriers: 0, regen: 0.45 },
    { name: 'Eyes overhead', hint: 'Seeds restored — shelter from the harrier', lane: 'middle', interval: [1800, 2200], cats: 1, foxes: 1, harriers: 1, regen: 0.6 },
    { name: 'Marsh scramble', hint: 'Spread shelter across both arrival lanes', lane: 'alternating', interval: [1600, 2000], cats: 1, foxes: 1, harriers: 1, regen: 0.6 },
    { name: 'King tide', hint: 'Rebuild inland — floating wrack offers brief cover', lane: 'middle', interval: [1400, 1800], cats: 1, foxes: 1, harriers: 1, regen: 0.6 },
];

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
                maxSeeds: 14,
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
            isLevelComplete: false,
        };
    }

    getWaveProfile() {
        return WAVE_PROFILES[Math.max(0, this.waveNumber - 1)] || WAVE_PROFILES[7];
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
