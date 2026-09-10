export const AUTHENTIC_MARSH_FACTS = [
    {
        species: "Ridgway's Rail",
        scientificName: "Rallus obsoletus",
        icon: 'icon_leaf',
        headline: 'Sea Salt Sneeze',
        fact: "Ridgway's Rails possess specialized supraorbital salt glands that filter excess salt directly from their blood, allowing them to drink pure seawater and sneeze out concentrated brine droplets!",
        ticker: "RIDGWAY'S RAIL: Salt glands filter seawater so rails can drink pure ocean brine"
    },
    {
        species: "Ridgway's Rail",
        scientificName: "Rallus obsoletus",
        icon: 'icon_wave',
        headline: 'Floating Woven Nests',
        fact: "Rails weave living cordgrass stems into buoyant raft nests that slide up and down with daily tidal surges, preventing eggs from drowning during normal high water.",
        ticker: "RIDGWAY'S RAIL: Weaves buoyant cordgrass nests that float up and down with daily tides"
    },
    {
        species: "Ridgway's Rail",
        scientificName: "Rallus obsoletus",
        icon: 'icon_bolt',
        headline: '"Thin as a Rail"',
        fact: "The phrase 'thin as a rail' originated from this bird's laterally compressed body—narrow like a pancake—which lets it sprint silently through dense pickleweed without rustling a single stem.",
        ticker: "RIDGWAY'S RAIL: 'Thin as a rail' refers to their flat bodies built to slip through dense marsh stems"
    },
    {
        species: "Ridgway's Rail",
        scientificName: "Rallus obsoletus",
        icon: 'icon_alert',
        headline: 'King Tide Peril',
        fact: "Extreme winter king tides inundate low-marsh hiding spots. Rails are forced up into tall gumplant bushes along transition zones, where surviving depends on high-tide refugia cover.",
        ticker: "KING TIDES: Over 90% of SF Bay tidal wetlands are lost — gumplant corridors give rails escape cover"
    },
    {
        species: "Pacific Cordgrass",
        scientificName: "Spartina foliosa",
        icon: 'icon_sprout',
        headline: 'Hollow Breathing Stems',
        fact: "Submerged under saltwater for up to 18 hours each day, native Cordgrass breathes using aerenchyma—sponge-like hollow air tubes that pump oxygen from leaves down to waterlogged roots.",
        ticker: "CORDGRASS: Hollow aerenchyma stems pump oxygen from surface air down into muddy roots"
    },
    {
        species: "Pacific Cordgrass",
        scientificName: "Spartina foliosa",
        icon: 'icon_sprout',
        headline: 'Ecosystem Engineer',
        fact: "Stiff cordgrass stems slow rushing tidal currents, trapping tons of suspended sediment and naturally building up marsh elevation to buffer Bay shores against sea-level rise.",
        ticker: "CORDGRASS: Traps tidal silt with dense stems, building natural marsh elevation against sea rise"
    },
    {
        species: "Pacific Pickleweed",
        scientificName: "Salicornia pacifica",
        icon: 'icon_leaf',
        headline: 'Sacrificial Salt Storage',
        fact: "Pickleweed stores toxic salt inside cell vacuoles at the tips of its succulent stems. In autumn, these segments turn brilliant red and drop off, shedding the accumulated salt.",
        ticker: "PICKLEWEED: Stores excess salt in stem tips that turn fiery red in autumn and drop off"
    },
    {
        species: "Pacific Pickleweed",
        scientificName: "Salicornia pacifica",
        icon: 'icon_paw',
        headline: 'Harvest Mouse Lifeline',
        fact: "The endangered Salt Marsh Harvest Mouse relies almost entirely on dense pickleweed for shelter and food, capable of drinking salty seawater with specialized kidneys.",
        ticker: "PICKLEWEED: Provides 90%+ of food and cover for the endangered Salt Marsh Harvest Mouse"
    },
    {
        species: "Saltgrass",
        scientificName: "Distichlis spicata",
        icon: 'icon_star',
        headline: 'Glittering Salt Crystals',
        fact: "Saltgrass is a recretohalophyte: active microscopic glands on its blades excrete excess salt water that evaporates under the sun into sparkling, diamond-like salt crystals.",
        ticker: "SALTGRASS: Active salt glands excrete brine that dries into glittering crystals in the sun"
    },
    {
        species: "Saltgrass",
        scientificName: "Distichlis spicata",
        icon: 'icon_leaf',
        headline: 'Tough Coastal Armor',
        fact: "Creeping underground rhizomes knit together into dense, springy sod that anchors the high marsh, protecting tidal banks from severe storm erosion and king tide waves.",
        ticker: "SALTGRASS: Tough creeping rhizome sod armors high marsh banks against tidal erosion"
    },
    {
        species: "Marsh Jaumea",
        scientificName: "Jaumea carnosa",
        icon: 'icon_sprout',
        headline: '"Salty Susan" Succulent',
        fact: "Known colloquially as 'Salty Susan', Jaumea features thick fleshy leaves that store pure water in saline flats, bursting with yellow daisy-like flowers each summer.",
        ticker: "JAUMEA: Nicknamed 'Salty Susan' — fleshy succulent leaves store fresh water amidst tidal mud"
    },
    {
        species: "Marsh Jaumea",
        scientificName: "Jaumea carnosa",
        icon: 'icon_leaf',
        headline: 'Channel Stabilizer',
        fact: "Jaumea forms dense woven carpets in moist saline depressions along tidal sloughs, anchoring soft estuarine soils where other terrestrial plants cannot survive.",
        ticker: "JAUMEA: Woven subterranean rhizome mats stabilize slough banks where ordinary plants fail"
    },
    {
        species: "Marsh Gumplant",
        scientificName: "Grindelia stricta",
        icon: 'icon_sprout',
        headline: "Nature's Sticky Shield",
        fact: "Before opening, Gumplant flower buds secrete a thick, milky, aromatic resin that serves as natural sunscreen, pest repellent, and an ancient Native American healing adhesive.",
        ticker: "GUMPLANT: Flower buds produce thick sticky resin that acts as natural sunscreen and pest shield"
    },
    {
        species: "Marsh Gumplant",
        scientificName: "Grindelia stricta",
        icon: 'icon_leaf',
        headline: 'High-Tide Refugia Hero',
        fact: "Growing tall on natural creek levees and upland transitions, Gumplant creates sturdy woody branches where Ridgway's Rails cling safely above cresting king tides.",
        ticker: "GUMPLANT: Woody high-marsh bushes provide vital high-tide refugia for rails during king tides"
    },
];

export function getRandomMarshFact(excludeIndex = -1) {
    let index = Math.floor(Math.random() * AUTHENTIC_MARSH_FACTS.length);
    if (excludeIndex >= 0 && AUTHENTIC_MARSH_FACTS.length > 1 && index === excludeIndex) {
        index = (index + 1) % AUTHENTIC_MARSH_FACTS.length;
    }
    return { ...AUTHENTIC_MARSH_FACTS[index], index };
}

export function getMarshTickerString() {
    return AUTHENTIC_MARSH_FACTS.map(f => `${f.ticker}`).join('    ◆    ') + '    ◆    ';
}
