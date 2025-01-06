import { readFileSync, writeFileSync } from 'node:fs';

const path = '../../dump';

const BAD_STRINGS = [
	// MOC
    "MOC",
    // Only Instructions
    "solo (manuali|instrucciones|istruzioni)",
    "^libretto istruzioni",
    "^(libretto|istruzioni) (\S+\s+)?Lego",
    "^Lego istruzioni",
    "notices Lego",
    "carte Lego",
    "Notice only",
    "handleiding enkel",
    "^Notices?\s+(\S+\s+)?Lego",
    "^Notices? de montage",
    "Manua(l|is) (de )?Instruç",
    "^Lego\s+(\S+\s+)?Notice",
    "^(Lego\s+)?Manuales?(\s+Lego)?",
    "^Lego\s+(\S+\s+)?(instructieboekje|boek)",
    "^Livret instructions",
    "^Libro lego",
    "^Boekje lego",
    "^Enkel de Boekje",
    "^Instrucciones(\s+y\s+pegatinas)?",
    // Catalog, maganizes
    "^(Catalog|Catálogo)s?\s+(-\s+)?Lego",
    "^Lego\s+(\S+\s+)?magazine",
    "^Lego\s+(\S+\s+)?poster",
    "^Poster\s+Lego",
    // Only Box
    "(Only|Solo) (Box|Scatola)",
    "Bo(i|î)te(s)? (Lego )?vide",
    "(Scatole vuote|Scatola vuota|Caixa vazia)",
    // Wall Support
    "^(Lego )?(Supporto|Stand)",
    "^Support\s+Lego",
    "Vitrina",
    // Misc Lego
    "Lego lotto da ",
    // Only Minifigs
    "lot\s*(de\s+\d+)\s*(mini)?figurines",
    "(minifig|minifigure|minifigura|Figurine)s?\s+(\S+\s+)?(Lego|Compatible)",
    "^(minifig|minifigure|minifigura|Figurine|Figura)",
    "Lego\s+(\S+\s+)?(minifig|minifigure|minifigura|Figurine)s?",
    "(cas|col|cty|hol|hp|loc|lor|mar|njo|pi|sh|sp|sw)\d{3,6}",
    "^Vend personnage",
    "^Personnage Simpson",
    "^Iron Baron",
    // Specific parts
    "^Lego (\d+ )?drapeaux chevalier",
    "^Couverture de cheval",
    "^Lego (\S+ )?(coques|voile|stickers|autocollants|train rails|rails)",
    "^(Coques|Voile|Stickers|Autocollants|Train rails|Rails)",
    // No Minifigs,
    "(no|sans|geen|manque les) (mini )?(figurines|minifigures|personnage|minifiguren)",
    // Baseplate
    "^Lego\s+(\d+\s+)?(Basisplaat|Baseplate|wege?n?plate?n?|grondplaat|plaque|pièces?|pieces?)",
    "^(Baseplate|grondplaat|plaque|pièces?|pieces?|Base)\s+(\S+\s+)?Lego",
    "Solo la struttura",
    // Animals, Parts
    "\d{4}(bpb|c|p|pb|px)\d{1,3}",
    "^(Accessoires|Accessorios) Lego",
    "^Lot d'accessoires",
    "^Lot de plate",
	"^Lego \d+ roues",
	"^Lego accessoires",
	// Telecommande
	"^T\Sl\Scommande",
	// Lights
	"Light My Bricks",
	"^Led\s+",
	"Kit\s+Led\s+pour",
	// Polybag
	"polybag",
	// DVD
	"(Dvd|videogame|Nintendo|Jeu switch|Jeu vid|Playstation|PS3|PS4|PS5|Xbox|wii)",
	// Keys
    "(Portachiavi|sleutelhanger|keychain)",
    "porte.?cl(e|é)",
	// Clothing
	"verkleedset",
	"Veste de ski",
	"Adidas (ZX|Ultraboost)",
	"(Chaqueta|Toalla|pyjama|Camiseta)",
	"Costume\s+(\S+\s+)?Lego",
	"De?é?guisement",
    "(Tee-?|T-?)shirt",
    "(nachtlamp|orologio)",
	// Non-Lego
	"(Genre|Tipo|Type|Style|Compatible|Compatível|compatibili|Compatibile|Replica|non originale)s?\s+(\S+\s+)?lego",
	"lego\s+(\S+\s+)?(Genre|Tipo|Type|Style|Compatible|Compatível|compatibili|Compatibile|Replica|non originale)s?",
	"compatibili per treno",
	"Compatibile o simile",
	"Compatible con",
	"Lego-compatibili",
	"compatibili (per treno )? Lego",
	"(Ensemble Playmobil|^Playmobil)",
	"pas de (la marque|vrais) Lego",
	"pas (de|un) Lego",
	"R(e|é)plique LEGO",
	"WW2",
	"pas compatible",
	"lego no oficial",
	"Geen originele",
	"no es (de la marca )?Lego",
	"parts are compatible",
	"Figurine Compatible",
	"Briques de construction",
	"(Brickarms|Montini|Lepin|mini lego|lego girls|abrick|Mould king|guerra|Jie Star|Blocki|Urba?e?n artic|Spea)",
	"M(e|é)ga bloc?ks",
	// Legos I don't care about
	"Brick Headz",
	"BrickHeadz",
	"Minecraft",
	"Lego Bionicle",
	"Lego Friends",
	"Lego Primo",
	"Lego Star Wars",
	"Lego DOTS",
	"nexo knights",
	"Chima",
	"Vidiyo"
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