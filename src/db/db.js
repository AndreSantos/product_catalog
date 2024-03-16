import { readFileSync, writeFileSync } from 'node:fs';

export function persistData(itemsCache, itemsRead) {
    persistItemsCache(itemsCache);
	writeFileSync('dump/items_read.txt', JSON.stringify(itemsRead));
}

export function persistIterations(iterations) {
	writeFileSync('dump/iterations.txt', JSON.stringify(iterations));
}

export function persistItemsCache(itemsCache) {
    const unwantedSets = JSON.parse(readFileSync('dump/unwanted_sets.txt', 'utf8'));
    const unwantedItems = JSON.parse(readFileSync('dump/unwanted_items.txt', 'utf8'));
    const items = {};
    Object.keys(itemsCache).filter(key => !unwantedSets[key]).forEach(key => {
        const filteredItems = itemsCache[key].filter(item => !unwantedItems[item.id]);
        if (filteredItems.length) {
            items[key] = filteredItems;
        }
    });
    writeFileSync('dump/items.txt', JSON.stringify(items));
}

export function persistPrices(prices) {
	writeFileSync('dump/prices.txt', JSON.stringify(prices));
}

export function persistUnwantedItems(unwantedItems) {
    writeFileSync('dump/unwanted_items.txt', JSON.stringify(unwantedItems));
}

export function persistUnwantedSets(unwantedSets) {
    writeFileSync('dump/unwanted_sets.txt', JSON.stringify(unwantedSets));
}

export function readData() {
    const itemsCache = JSON.parse(readFileSync('dump/items.txt', 'utf8'));
    const itemsRead = JSON.parse(readFileSync('dump/items_read.txt', 'utf8'));
    const iterations = readIterations();
    const prices = JSON.parse(readFileSync('dump/prices.txt', 'utf8'));
    const unwantedSets = JSON.parse(readFileSync('dump/unwanted_sets.txt', 'utf8'));
    const unwantedItems = JSON.parse(readFileSync('dump/unwanted_items.txt', 'utf8'));
    const unwantedUsers = JSON.parse(readFileSync('dump/unwanted_users.txt', 'utf8'));
    return {itemsCache, itemsRead, iterations, prices, unwantedSets, unwantedItems, unwantedUsers};
}

export function readIterations() {
    const iterations = JSON.parse(readFileSync('dump/iterations.txt', 'utf8'));
    return iterations;
}

export function readBadStrings() {
    return JSON.parse(readFileSync('dump/bad_strings.txt', 'utf8'));
}

export function writeBadStrings(badStrings) {
    writeFileSync('dump/bad_strings.txt', JSON.stringify(badStrings));
}