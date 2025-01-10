import {searchItems} from '../vinted/list_items.js';
import {viewItem} from '../vinted/view_item.js';
import {readData, persistData} from '../db/db.js';
import {lens} from '../image/lens_puppeteer.js';
import {sendMail} from './mail.js';

function log(str) {
	console.log(new Date().toLocaleString(), str);
}

function sanitizeValue(str, user_login) {
	return str
		.replaceAll(`${user_login}`, '')
		.replaceAll(/("|'|´|`|-|\.|,|;|!|\?)/ig, ' ')
		.replaceAll(/Disney|Western|City|Technic|System|Speed Champions/ig, '')
		.replaceAll(/(á|à|ã)/ig, 'a')
		.replaceAll(/ç/ig, 'c')
		.replaceAll(/(é|è)/ig, 'e')
		.replaceAll(/î/ig, 'i')
		.replaceAll(/(ú)/ig, 'u')
		.replaceAll(/anne?e[^a-zA-Z0-9-]+\d{4}/ig, '')
		.replaceAll(/\d{3,5}\s+pi?e?ce?s/ig, '')
		.replaceAll(/\s+/ig, ' ');
}

function shouldDiscard(badExpressions, str) {
	const s = str.toLowerCase();
	return badExpressions.find(bad => !!s.match(bad));
}

function shouldDiscardBrand(brand) {
	if (!brand || brand.trim().length === 0) {
		return false;
	}
	const isLego = [/lego/i, /technic/i, /city/i].some(exp => !!brand.match(exp));
	return !isLego;
}

function sanitizeSets(sets) {
	return [...new Set(sets)];
}

function getInferredSets(item) {
	const infer = item.infer.title.length > 0 ?
			item.infer.title :
			(item.infer.description.length > 0 ?
				item.infer.description :
				item.infer.photo);
	return infer ?? [];
}

function getMaxPrice(inferredSets, pricesCache) {
	let maxPrice = 0;
	for (const key of inferredSets) {
		const maxPriceForItem = pricesCache[key];
		maxPrice += maxPriceForItem > 0 ? maxPriceForItem : 5;
	}
	return maxPrice;
}

function isPossibleGold(item, pricesCache) {
	const cacheKey = getInferredSets(item);
	if (!cacheKey.length) {
		return false;
	}
	let maxPrice = 0;
	let hasAtLeastOneItemWithPrice = false;
	for (const key of cacheKey) {
		const maxPriceForItem = pricesCache[key];
		maxPrice += maxPriceForItem > 0 ? maxPriceForItem : 5;
		
		hasAtLeastOneItemWithPrice ||= (maxPriceForItem > 0);
	}
	// console.log('isPossibleGold', cacheKey, maxPrice, hasAtLeastOneItemWithPrice);
	if (!hasAtLeastOneItemWithPrice) {
		return false;
	}
	return item.price <= maxPrice && !(item.price <= 5 && maxPrice >= 25);
}

export async function job() {
	const data = readData();
	const itemsCache = data.itemsCache;
	const itemsRead = data.itemsRead;
	const unwantedSets = data.unwantedSets;
	const prices = data.prices;
	const unwantedUsers = data.unwantedUsers;
	const badExpressions = data.badExpressions;

	const iteration = {
		start: new Date(),
		totalItems: 0,
		pastItems: 0,
		unwantedItems: 0,
		unwantedUsers: 0,
		addedItems: 0,
		discardedItems: 0,
		titleInfered: 0,
		descriptionInfered: 0,
		photoInfered: 0,
		vintedXhrs: 1,
		descriptionTest: 0,
		photoTest: 0,
		possibleGold: 0,
		photoFailure: 0,
	};
	const descriptionCache = {};
	log('Starting new iteration.');
	const response = await searchItems({text: 'lego'});
	iteration.totalItems = response.items.length;
	for (let [index, item] of response.items.entries()) {
		log(`Processing item ${index}...`);
		if (itemsRead[item.id]) {
			log(`Skipping past item.`);
			iteration.pastItems++;
			continue;
		}
		log(item);
		itemsRead[item.id] = iteration.start;
		item.time = iteration.start;
		if (unwantedUsers.includes(item.user_id) || unwantedUsers.includes(item.user_login)) {
			iteration.unwantedUsers++;
			log(`Discarded due to unwanted user ${item.user_id} / ${item.user_login}.`);
			continue;
		}
		const title = sanitizeValue(item.title, item.user_login);
		if (shouldDiscard(badExpressions, title)) {
			log(`Discarded due to title (${item.title}) by expression: ${shouldDiscard(badExpressions, title)}.`);
			iteration.discardedItems++;
			continue;
		}
			
		if (shouldDiscardBrand(item.brand)) {
			log(`Discarded due to brand (${item.brand}).`);
			iteration.discardedItems++;
			continue;
		}
		const titleSets = [...title.matchAll(/[^0-9]*(\d{4,7})[^0-9]?\D*/g)].map(m => m[1]);
		item.infer = {
			title: sanitizeSets(titleSets),
			description: [],
			photo: [],
		};
		const couldBeGoldFromTitle = isPossibleGold(item, prices);
		let viewItemReturn;
		if (!item.infer.title.length || couldBeGoldFromTitle) {
			if (couldBeGoldFromTitle) {
				log(`Could be gold from title, need to check description`);
			}
			log(`Obtaining description.`);
			iteration.descriptionTest++;
			descriptionCache[item.user_id] = descriptionCache[item.user_id] || [];
			if (descriptionCache[item.user_id].length === 0) {
				log(`Fetching description.`);
				descriptionCache[item.user_id] = await viewItem(item);
				iteration.vintedXhrs++;
			} else {
				log(`Reading description from cache.`);
			}
			viewItemReturn = descriptionCache[item.user_id].filter(i => i.id === item.id).map(i => ({
				...item,
				...i
			}))[0];
		}
		if (viewItemReturn) {
			log(`Fetched description or was in cache.`);
			item = viewItemReturn;
			const description = sanitizeValue(item.description, item.user_login);
			const descriptionSets = [...description.matchAll(/[^0-9]*(\d{4,7})[^0-9]?\D*/g)].map(m => m[1]);

			item.infer.description = sanitizeSets(descriptionSets);
			
			if (shouldDiscard(badExpressions, description)) {
				log(`Discarded due to description (${description}) by expression: ${shouldDiscard(badExpressions, description)}.`);
				iteration.discardedItems++;
				continue;
			}
		} else {
			log(`Description not present.`);
		}
		if (!item.infer.title.length && !item.infer.description.length) {
			log(`Falling back to inferring photo.`);
			if (item.photos && item.photos.length > 0) {
				iteration.photoTest++;
				try {
					const photoInferredSet = await lens(item.photos[0]);
					item.infer.photo = photoInferredSet ? [photoInferredSet] : []; 
				} catch (e) {
					iteration.photoFailure++;
				}
			}
		}

		if (item.infer.title.length > 0) {
			iteration.titleInfered++, iteration.addedItems++;
		} else if (item.infer.description.length > 0) {
			iteration.descriptionInfered++, iteration.addedItems++;
		} else if (item.infer.photo.length > 0) {
			iteration.photoInfered++, iteration.addedItems++;
		}
		
		// Created At (is only set in view call).
		item.created_at = item.created_at ?? iteration.start.toString();
		
		const inferredSets = getInferredSets(item);
		const areAllUnwantedItems = inferredSets.every(s => unwantedSets[s]);
		
		if (areAllUnwantedItems) {
			if (inferredSets.length) {
				log(`Unwanted set(s) ${inferredSets}.`);
			} else {
				log(`Didn't infer set.`);
			}
			iteration.unwantedItems++;
		} else {
			const cacheKey = inferredSets.join(' + ');
			itemsCache[cacheKey] = itemsCache[cacheKey] || [];
			itemsCache[cacheKey] = [...itemsCache[cacheKey], item].sort((a, b) => a.price > b.price);
			if (isPossibleGold(item, prices)) {
				iteration.possibleGold++;
				const maxPrice = getMaxPrice(inferredSets, prices);
				sendMail(cacheKey, item, maxPrice);
			}
		}
		persistData(itemsCache, itemsRead);
	}
	iteration.end = new Date();
	log(iteration);
	return iteration;
}
