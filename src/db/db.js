import { readFileSync, writeFileSync } from 'node:fs';

const path = '../../dump';

const BAD_STRINGS = [
	// MOC
	/MOC/i,
	// Only Instructions
	/solo (manuali|instrucciones|istruzioni)/i,
	/^libretto istruzioni/i,
	/^(libretto|istruzioni) (\S+\s+)?Lego/i,
	/^Lego istruzioni/i,
	/notices Lego/i,
	/carte Lego/i,
	/Notice only/i,
	/handleiding enkel/i,
	/^Notices?\s+(\S+\s+)?Lego/i,
	/^Notices? de montage/i,
	/Manua(l|is) (de )?Instruç/i,
	/^Lego\s+(\S+\s+)?Notice/i,
	/^(Lego\s+)?Manuales?(\s+Lego)?/i,
	/^Lego\s+(\S+\s+)?(instructieboekje|boek)/i,
	/^Livret instructions/i,
	/^Libro lego/i,
	/^Boekje lego/i,
	/^Enkel de Boekje/i,
	/^Instrucciones(\s+y\s+pegatinas)?/i,
	// Catalog, maganizes
	/^(Catalog|Catálogo)s?\s+(-\s+)?Lego/i,
	/^Lego\s+(\S+\s+)?magazine/i,
	/^Lego\s+(\S+\s+)?poster/i,
	/^Poster\s+Lego/i,
	// Only Box
	/(Only|Solo) (Box|Scatola)/i,
	/Bo(i|î)te(s)? (Lego )?vide/i,
	/(Scatole vuote|Scatola vuota|Caixa vazia)/i,
	// Wall Support
	/^(Lego )?(Supporto|Stand)/i,
	/^Support\s+Lego/i,
	/Vitrina/i,
	// Misc Lego
	/Lego lotto da /i,
	// Only Minifigs
	/lot\s*(de\s+\d+)\s*(mini)?figurines/i,
	/(minifig|minifigure|minifigura|Figurine)s?\s+(\S+\s+)?(Lego|Compatible)/i,
	/^(minifig|minifigure|minifigura|Figurine|Figura)/i,
	/Lego\s+(\S+\s+)?(minifig|minifigure|minifigura|Figurine)s?/i,
	/(cas|col|cty|hol|hp|loc|lor|mar|njo|pi|sh|sp|sw)\d{3,6}/i,
	/^Vend personnage/i,
	/^Personnage Simpson/i,
	/^Iron Baron/i,
	// Specific parts
	/^Lego (\d+ )?drapeaux chevalier/i,
	/^Couverture de cheval/i,
	/^Lego (\S+ )?(coques|voile|stickers|autocollants|train rails|rails)/i,
	/^(Coques|Voile|Stickers|Autocollants|Train rails|Rails)/i,
	// No Minifigs,
	/(no|sans|geen|manque les) (mini )?(figurines|minifigures|personnage|minifiguren)/i,
	// Baseplate
	/^Lego\s+(\d+\s+)?(Basisplaat|Baseplate|wege?n?plate?n?|grondplaat|plaque|pièces?|pieces?)/i,
	/^(Baseplate|grondplaat|plaque|pièces?|pieces?|Base)\s+(\S+\s+)?Lego/i,
	/Solo la struttura/i,
	// Animals, Parts
	/\d{4}(bpb|c|p|pb|px)\d{1,3}/i,
	/^(Accessoires|Accessorios) Lego/i,
	/^Lot d'accessoires/i,
	/^Lot de plate/i,
	/^Lego \d+ roues/i,
	/^Lego accessoires/i,
	// Telecommande
	/^T\Sl\Scommande/i,
	// Lights
	/Light My Bricks/i,
	/^Led\s+/i,
	/Kit\s+Led\s+pour/i,
	// Polybag
	/polybag'/i,
	// DVD
	/(Dvd|videogame|Nintendo|Jeu switch|Jeu vid|Playstation|PS3|PS4|PS5|Xbox|wii)/i,
	// Keys
	/(Portachiavi|sleutelhanger|keychain)/i,
	/porte.?cl(e|é)/i,
	// Clothing
	/verkleedset/i,
	/Veste de ski/i,
	/Adidas (ZX|Ultraboost)/i,
	/(Chaqueta|Toalla|pyjama|Camiseta)/i,
	/Costume\s+(\S+\s+)?Lego/i,
	/De?é?guisement/i,
	/(Tee-?|T-?)shirt/i,
	/(nachtlamp|orologio)/i,
	// Non-Lego
	/(Genre|Tipo|Type|Style|Compatible|Compatível|compatibili|Compatibile|Replica|non originale)s?\s+(\S+\s+)?lego/i,
	/lego\s+(\S+\s+)?(Genre|Tipo|Type|Style|Compatible|Compatível|compatibili|Compatibile|Replica|non originale)s?/i,
	/compatibili per treno/i,
	/Compatibile o simile/i,
	/Compatible con/i,
	/Lego-compatibili/i,
	/compatibili (per treno )? Lego/i,
	/(Ensemble Playmobil|^Playmobil)/i,
	/pas de (la marque|vrais) Lego/i,
	/pas (de|un) Lego/i,
	/R(e|é)plique LEGO/i,
	/WW2/i,
	/pas compatible/i,
	/lego no oficial/i,
	/Geen originele/i,
	/no es (de la marca )?Lego/i,
	/parts are compatible/i,
	/Figurine Compatible/i,
	/Briques de construction/i,
	/(Brickarms|Montini|Lepin|mini lego|lego girls|abrick|Mould king|guerra|Jie Star|Blocki|Urba?e?n artic|Spea)/i,
	/M(e|é)ga bloc?ks/i,
	// Legos I don't care about
	/Brick Headz/i,
	/BrickHeadz/i,
	/Minecraft/i,
	/Lego Bionicle/i,
	/Lego Friends/i,
	/Lego Primo/i,
	/Lego Star Wars/i,
	/Lego DOTS/i,
	/nexo knights/i,
	/Chima/i,
	/Vidiyo/i
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

export function persistBadExpressions(badExpressions) {
    writeFileSync(path + '/bad_expressions.txt', JSON.stringify(badExpressions));
}

export function readData() {
    const itemsCache = readOrDefaultTo(path + '/items.txt', {});
    const itemsRead = readOrDefaultTo(path + '/items_read.txt', {});
    const badExpressions = readOrDefaultTo(path + '/bad_expressions.txt', BAD_STRINGS);
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