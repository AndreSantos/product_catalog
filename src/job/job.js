import {searchItems} from '../vinted/list_items.js';
import {viewItem} from '../vinted/view_item.js';
import {readData, persistData} from '../db/db.js';
import {lens, resetTabsAndOpenLens, takeErrorScreenshot} from '../image/lens_puppeteer.js';
import {sendMail} from './mail.js';

function log(str) {
	console.log(new Date().toLocaleString(), str);
}

export function sanitizeValue(str, user_login) {
	return str
		.replaceAll(`${user_login}`, '')
		.replaceAll(/("|'|´|`|-|\.|,|;|:|!|\?)/ig, ' ')
		.replaceAll(/Vend/ig, ' ')
		.replaceAll(/(á|à|ã)/ig, 'a')
		.replaceAll(/ç/ig, 'c')
		.replaceAll(/(é|è|ê)/ig, 'e')
		.replaceAll(/î/ig, 'i')
		.replaceAll(/(ú)/ig, 'u')
		.replaceAll(/Batman|Fantasy Era|Castle|Indiana Jones|Star Wars|Ninjago|Vintage|Disney|Western|City|Technic|System|Speed Champions|Marvel/ig, '')
		.replaceAll(/Seas|Barracuda|Custom|groot|big|small|viking|3in1|Vendo|set/ig, ' ')
		.replaceAll(/Black|Rosso|Neuf/ig, ' ')
		.replaceAll(/\d{1,3} ?x/ig, ' ')				// ex: 10x or 10 x
		.replaceAll(/(^| )(19|20)\d{2}( |$)/ig, ' ')	// ex: 1998
		.replaceAll(/\d{3,5}\s+pi?e?ce?s/ig, '')
		.replaceAll(/\s+/ig, ' ');
}

export function extraSanitizationBeforeDiscardStep(str) {
	return str.toLowerCase()
		.replaceAll(/(^| )\d+($| )/ig, ''); // Remove numbers like set IDs, but keep bricklinkg IDs like pi146
}

function shouldDiscard(badExpressions, str) {
	const extraSanitizationStep = extraSanitizationBeforeDiscardStep(str);
	return badExpressions.find(bad => !!extraSanitizationStep.match(bad));
}

function shouldDiscardBrand(brand) {
	if (!brand || brand.trim().length === 0) {
		return false;
	}
	const isLego = [/lego/i, /technic/i, /city/i, /space/i, /speed champions/i].some(exp => !!brand.match(exp));
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

function isPossibleGold(inferredSets, price, pricesCache, shouldLog) {
	if (!inferredSets.length) {
		return false;
	}
	let maxPrice = 0;
	let hasAtLeastOneItemWithPrice = false;
	for (const key of inferredSets) {
		const maxPriceForItem = pricesCache[key];
		maxPrice += maxPriceForItem > 0 ? maxPriceForItem : 5;
		
		hasAtLeastOneItemWithPrice ||= (maxPriceForItem > 0);
	}
	if (!hasAtLeastOneItemWithPrice) {
		if (shouldLog) {
			log('Not interested in sets.');
		}
		return false;
	}
	
	if (shouldLog) {
		log(`Item price (max): ${price} (${maxPrice})`);
	}
	return price <= maxPrice && !(price <= 5 && maxPrice >= 25);
}

function checkIfRepost(item, itemsCache) {
	for (let items of Object.values(itemsCache)) {
		const maybeRepost = items.find(it => 
			it.user_id === item.user_id &&
			it.brand === item.brand &&
			it.status === item.status &&
			it.title === item.title &&
			it.firstPhotoDominantColor === item.firstPhotoDominantColor);
		if (maybeRepost) {
			return maybeRepost;
		}
	}
	return false;
}

function addToCache(item, cacheKey, itemsCache) {
	itemsCache[cacheKey] = itemsCache[cacheKey] || [];
	itemsCache[cacheKey] = [...itemsCache[cacheKey], item].sort((a, b) => a.price > b.price);
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
		repost: 0,
		items: [],
	};
	const descriptionCache = {};
	log('Starting new iteration.');

	log('Clearing up old entries in the cache.');
	for (const key of Object.keys(itemsCache)) {
		itemsCache[key] = itemsCache[key].filter(item => 
			iteration.start - new Date(item.time) <= 1000 * 60 * 60 * 32
		);
	}
	const response = await searchItems({text: 'lego'});
	iteration.totalItems = response.items.length;
	for (let [index, item] of response.items.entries()) {
		log(`Processing item ${index}...`);
		if (itemsRead[item.id]) {
			log(`Skipping past item.`);
			iteration.pastItems++;
			iteration.items.push({item, pastItem: true});
			continue;
		}
		log(item);
		itemsRead[item.id] = iteration.start;
		item.time = iteration.start;

		const repost = checkIfRepost(item, itemsCache);
		if (repost) {
			log(`Is a repost of:`);
			log(repost);
			iteration.repost++;
			item.isRepost = true;
			const inferredSets = getInferredSets(repost);
			const cacheKey = inferredSets.join(' + ');
			addToCache(item, cacheKey, itemsCache);
			if (isPossibleGold(inferredSets, item.price, prices, true)) {
				iteration.possibleGold++;
				const maxPrice = getMaxPrice(inferredSets, prices);
				sendMail(cacheKey, item, maxPrice);
			}
			iteration.items.push({item, repost: true});
			continue;
		}
		if (unwantedUsers.includes(item.user_id) || unwantedUsers.includes(item.user_login)) {
			log(`Discarded due to unwanted user ${item.user_id} / ${item.user_login}.`);
			iteration.unwantedUsers++;
			iteration.items.push({item, unwantedUser: item.user_login});
			continue;
		}
		const title = sanitizeValue(item.title, item.user_login);
		if (shouldDiscard(badExpressions, title)) {
			log(`Discarded due to title (${item.title}) by expression: ${shouldDiscard(badExpressions, title)}.`);
			iteration.discardedItems++;
			iteration.items.push({item, titleDiscarded: shouldDiscard(badExpressions, title)});
			continue;
		}
			
		if (shouldDiscardBrand(item.brand)) {
			log(`Discarded due to brand (${item.brand}).`);
			iteration.discardedItems++;
			iteration.items.push({item, brandDiscarded: true});
			continue;
		}
		const titleSets = [...title.matchAll(/[^0-9]*(\d{4,7})[^0-9]?\D*/g)].map(m => m[1]);
		item.infer = {
			title: sanitizeSets(titleSets),
			description: [],
			photo: [],
		};
		const couldBeGoldFromTitle = isPossibleGold(getInferredSets(item), item.price, prices, false);
		const needDescription = !item.infer.title.length || couldBeGoldFromTitle;
		let viewItemReturn;
		if (needDescription) {
			if (couldBeGoldFromTitle) {
				log(`Could be gold from title, need to check description`);
			} else {
				log(`Didn't infer from title, obtaining description.`);
			}
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
			item = viewItemReturn;
			log(`description: ${item.description}`);
			const description = sanitizeValue(item.description, item.user_login);
			const descriptionSets = [...description.matchAll(/[^0-9]*(\d{4,7})[^0-9]?\D*/g)].map(m => m[1]);

			item.infer.description = sanitizeSets(descriptionSets);
			
			if (shouldDiscard(badExpressions, description)) {
				log(`Discarded due to description (${description}) by expression: ${shouldDiscard(badExpressions, description)}.`);
				iteration.discardedItems++;
				addToCache(item, 'discarded', itemsCache);
				iteration.items.push({item, descriptionDiscarded: shouldDiscard(badExpressions, description)});
				continue;
			}
		} else {
			if (needDescription) {
				log(`Description not present.`);
			}
		}
		let lensResult;
		if (!item.infer.title.length && !item.infer.description.length) {
			log(`Falling back to inferring photo.`);
			if (item.photos && item.photos.length > 0) {
				iteration.photoTest++;
				try {
					lensResult = await lens(item.photos[0]);
					const photoInferredSet = lensResult.set;
					item.infer.photo = photoInferredSet ? [photoInferredSet] : []; 
				} catch (e) {
					log(e);
					await takeErrorScreenshot();
					await resetTabsAndOpenLens();
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
		const cacheKey = inferredSets.length > 0 ? inferredSets.join(' + ') : 'undetermined';
		addToCache(item, cacheKey, itemsCache);
		
		const areAllUnwantedItems = inferredSets.every(s => unwantedSets[s]);
		if (areAllUnwantedItems) {
			if (inferredSets.length) {
				log(`Unwanted set(s) ${inferredSets}.`);
				iteration.items.push({item, unwantedSets: cacheKey, photoRecognition: lensResult?.logs});
			} else {
				log(`Didn't infer set.`);
				iteration.items.push({item, notInferred: true, photoRecognition: lensResult?.logs});
			}
			iteration.unwantedItems++;
		} else {
			log(`Inferred sets: ${cacheKey}`);
			const maxPrice = getMaxPrice(inferredSets, prices);
			if (isPossibleGold(inferredSets, item.price, prices, true)) {
				iteration.possibleGold++;
				sendMail(cacheKey, item, maxPrice);
				iteration.items.push({item, inferredGold: cacheKey, maxPrice, photoRecognition: lensResult?.logs});
			} else {
				iteration.items.push({item, inferred: cacheKey, maxPrice, photoRecognition: lensResult?.logs});
			}
		}
		persistData(itemsCache, itemsRead);
	}
	iteration.end = new Date();
	log(iteration);
	return iteration;
}
