import { readFileSync, writeFileSync } from 'node:fs';

const path = '../../dump';

const BAD_STRINGS = [
	// MOC
    "MOC",
    // Only Instructions
    "(Only|Solo) (Box|Scatola|manuali|instrucciones|istruzioni)",
    "^(Lego )?(Boekje|Libro|libretto|istruzioni|notice|Livret|Instrucciones|Manual)",
    "(notices|carte|Catalog|Poster) Lego",
    "Notice only",
    "handleiding enkel",
    "Manua(l|is) (de )?Instruç",
    "^Lego (\\S+ )?(istruzioni|notice|instructieboekje|boek)",
    "^Enkel de Boekje",
    "^pegatinas",
    // Catalog, maganizes
    "^Lego (\\S+ )?(poster|magazine)",
    "^Poster Lego",
    // Only Box
    "Boite(s)? (Lego )?vide",
    "(Scatole vuote|Scatola vuota|Caixa vazia)",
    // Wall Support
    "^(Lego )?(Supporto|Stand)",
    "^Support Lego",
    "Vitrina",
    // Misc Lego
    "Lego lotto da ",
    // Only Minifigs
    "lot\\s*(de \\d+)\\s*(mini)?figurines",
    "(minifig|minifigure|minifigura|Figurine)s? (\\S+ )?(Lego|Compatible)",
    "^(minifig|minifigure|minifigura|Figurine|Figura)",
    "Lego (\\S+ )?(minifig|minifigure|minifigura|Figurine)s?",
    "(cas|col|cty|hol|hp|loc|lor|mar|njo|pi|sh|sp|sw)\\d{3,6}",
    "^Vend personnage",
    "^Personnage Simpson",
    "^Iron Baron",
    // Specific parts
    "^Lego (\\d+ )?drapeaux chevalier",
    "^Couverture de cheval",
    "^Lego (\\S+ )?(coques|voile|stickers|autocollants|train rails|rails)",
    "^(Coques|Voile|Stickers|Autocollants|Train rails|Rails)",
    // No Minifigs,
    "(no|sans|geen|manque les) (mini )?(figurines|minifigures|personnage|minifiguren)",
    // Baseplate
    "^Lego (\\d+ )?(Basisplaat|Baseplate|wege?n?plate?n?|grondplaat|plaque|pièces?|pieces?)",
    "^(Baseplate|grondplaat|plaque|pieces?|Base) (\\S+ )?Lego",
    "Solo la struttura",
    // Animals, Parts
    "\\d{4}(bpb|c|p|pb|px)\\d{1,3}",
    "^(Accessoires|Accessorios) Lego",
    "^Lot d'accessoires",
    "^Lot de plate",
	"^Lego \\d+ roues",
	"^Lego accessoires",
	// Telecommande
	"^Telecommande",
	// Lights
	"Light My Bricks",
	"^Led",
	"Kit Led pour",
	// Polybag
	"polybag",
	// DVD
	"(Dvd|videogame|Nintendo|Jeu switch|Jeu vid|Playstation|PS3|PS4|PS5|Xbox|wii)",
	// Keys
    "(Portachiavi|sleutelhanger|keychain)",
    "porte.?cle",
	// Clothing
	"verkleedset",
	"Veste de ski",
	"Adidas (ZX|Ultraboost)",
	"(Chaqueta|Toalla|pyjama|Camiseta)",
	"Costume (\\S+ )?Lego",
	"Deguisement",
    "(Tee-?|T-?)shirt",
    "(nachtlamp|orologio)",
	// Non-Lego
	"(Genre|Tipo|Type|Style|Compatible|Compatível|compatibili|Compatibile|Replica|non originale)s? (\\S+ )?lego",
	"lego (\\S+ )?(Genre|Tipo|Type|Style|Compatible|Compatível|compatibili|Compatibile|Replica|non originale)s?",
	"compatibili per treno",
	"Compatibile o simile",
	"Compatible con",
	"Lego-compatibili",
	"compatibili (per treno )? Lego",
	"(Ensemble Playmobil|^Playmobil)",
	"pas de (la marque|vrais) Lego",
	"pas (de|un) Lego",
	"Replique LEGO",
	"WW2",
	"pas compatible",
	"lego no oficial",
	"Geen originele",
	"no es (de la marca )?Lego",
	"parts are compatible",
	"Figurine Compatible",
	"Briques de construction",
	"(Brickarms|Montini|Lepin|mini lego|lego girls|abrick|Mould king|guerra|Jie Star|Blocki|Urba?e?n artic|Spea)",
	"Mega bloc?ks",
	// Legos I don't care about
	"Lego (Primo|Star Wars|knights)",
	"(Brick\\s?Headz|Minecraft|Vidiyo|DOTS|Friends|Bionicle|Chima)"
];

export function persistData(itemsCache, itemsRead) {
    persistItemsCache(itemsCache);

    const now = new Date();
    for (const itemsReadKey of Object.keys(itemsRead)) {
        const d = itemsRead[itemsReadKey];
        if (typeof d === 'string' && now - new Date(d) > 1000 * 60 * 60 * 10) {
            delete itemsRead[itemsReadKey];
        }
    }
	writeFileSync(path + '/items_read.txt', JSON.stringify(itemsRead));
}

export function persistIterations(iterations) {
    const it = iterations.reverse();
    it.length = 50;
	writeFileSync(path + '/iterations.txt', JSON.stringify(it.reverse()));
}

export function persistItemsCache(itemsCache) {
    const unwantedSets = JSON.parse(readFileSync(path + '/unwanted_sets.txt', 'utf8'));
    const unwantedItems = JSON.parse(readFileSync(path + '/unwanted_items.txt', 'utf8'));
    const items = {};
    Object.keys(itemsCache).filter(key => !unwantedSets[key]).forEach(key => {
        const filteredItems = itemsCache[key].filter(item => !unwantedItems[item.id]);
        if (filteredItems.length) {
            items[key] = filteredItems;
        }
    });
    writeFileSync(path + '/items.txt', JSON.stringify(items));
}

export function persistPrices(prices) {
	writeFileSync(path + '/prices.txt', JSON.stringify(prices));
}

export function persistUnwantedItems(unwantedItems) {
    writeFileSync(path + '/unwanted_items.txt', JSON.stringify(unwantedItems));
}

export function persistUnwantedSets(unwantedSets) {
    writeFileSync(path + '/unwanted_sets.txt', JSON.stringify(unwantedSets));
}

export function persistBadExpressions(badExpressionsStrings) {
    writeFileSync(path + '/bad_expressions.txt', JSON.stringify(badExpressionsStrings));
}

export function readData() {
    const itemsCache = readOrDefaultTo(path + '/items.txt', {});
    const itemsRead = readOrDefaultTo(path + '/items_read.txt', {});
    const badExpressionsStrings = readOrDefaultTo(path + '/bad_expressions.txt', BAD_STRINGS);
    
    const badExpressions = badExpressionsStrings.map(str => new RegExp(str, 'i'));
    const iterations = readIterations();
    const prices = JSON.parse(readFileSync(path + '/prices.txt', 'utf8'));
    const unwantedSets = JSON.parse(readFileSync(path + '/unwanted_sets.txt', 'utf8'));
    const unwantedItems = JSON.parse(readFileSync(path + '/unwanted_items.txt', 'utf8'));
    const unwantedUsers = JSON.parse(readFileSync(path + '/unwanted_users.txt', 'utf8'));
    return {badExpressions, itemsCache, itemsRead, iterations, prices, unwantedSets, unwantedItems, unwantedUsers};
}

export function readIterations() {
    const iterations = JSON.parse(readFileSync(path + '/iterations.txt', 'utf8'));
    return iterations;
}

function readOrDefaultTo(file, def) {
    let contents = def;
    try {
        contents = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
        contents = def;
    }
    return contents;
}