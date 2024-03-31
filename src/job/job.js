import {searchItems} from '../vinted/list_items.js';
import {viewItem} from '../vinted/view_item.js';
import {readData, persistData} from '../db/db.js';
import {lens} from '../image/lens_puppeteer.js';
import {sendMail} from '../mail.js';

const BAD_STRINGS = [
	// MOC
	'MOC',
	// Only Instructions
	/solo (instrucciones|istruzioni)/i,
	/^libretto istruzioni/i,
	'notices Lego',
	'carte Lego',
	/^Notices?\s+(\w+\s+)?Lego/i,
	/^(Lego\s+)?Manuales?(\s+Lego)?/i,
	/^Lego\s+(\w+\s+)?instructieboekje/i,
	/^Livret instructions/i,
	/^Instrucciones(\s+y\s+pegatinas)?/i,
	// Catalog, maganizes
	/^(Catalog|Catálogo)s?\s+Lego/i,
	/^Lego\s+(\w+\s+)?magazine/i, 
	// Only Box
	/Bo(i|î)te(s)? vide/i,
	/(Scatole vuote|Caixa vazia)/i,
	// Wall Support
	/^(Lego )?(Supporto|Stand)/i,
	// Misc Lego
	'Lego lotto da ',
	// Only Minifigs
	/lot\s*(de\s+\d+)\s*(mini)?figurines/i,
	/(minifig|minifigure|minifigura|Figurine)s?\s+(\w+\s+)?(Lego|Compatible)/i,
	/Lego\s+(\w+\s+)?(minifig|minifigure|minifigura|Figurine)(s)?/i,
	/(cas|col|cty|hol|loc|mar|njo|sh|sw)\d{3,6}/i,
	/^Figuras? de lego/i,
	// No Minifigs,
	/(no|sans) minifigures/i,
	// Baseplate
	/^Lego\s+(\d+\s+)?(Baseplate|grondplaat|plaque|pièces?|pieces?)/i,
	/^(Baseplate|grondplaat|plaque|pièces?|pieces?)\s+Lego/i,
	// Animals, Parts
	/\d{4}(c|p|pb|px)\d{1,2}/i,
	// Polybag
	'polybag',
	// DVD
	/(Dvd|Jeu switch|Playstation|Xbox|wii)/i,
	// Keys
	'Portachiavi',
	/porte.?cl(e|é)/i,
	'sleutelhanger',
	// Clothing
	/Adidas (ZX|Ultraboost)/i,
	'Chaqueta',
	/(Tee|T-|T )shirt/i,
	// Non-Lego
	/(Tipo|Type|Style|Compatible|Compatível|compatibili|Compatibile)s?\s+(\w+\s+)?lego/i,
	/(Ensemble Playmobil|^Playmobil)/i,
	/pas de la marque Lego/i,
	/^lego no oficial/i,
	'Figurine Compatible',
	'Briques de construction',
	'Lepin',
	'mini legos',
	'abrick',
	'Mega blocks',
	// Legos I don't care about
	'Brick Headz',
	'BrickHeadz',
	'Minecraft',
	'Lego Bionicle',
	'Lego Friends',
	'Lego Primo',
	'Lego Star Wars',
	'Lego DOTS',
	'nexo knights',
	'Chima',
	'Vidiyo'
];

function log(str) {
	console.log(new Date().toLocaleString(), str);
}

function shouldDiscard(str) {
	const s = str.toLowerCase();
	return BAD_STRINGS.some(bad => bad instanceof RegExp ? !!s.match(bad) : s.includes(bad.toLowerCase()));
}

export async function job() {
	const data = readData();
	const itemsCache = data.itemsCache;
	const itemsRead = data.itemsRead;
	const unwantedSets = data.unwantedSets;
	const prices = data.prices;
	const unwantedUsers = data.unwantedUsers;

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
		descriptionCache: 0,
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
		if (itemsRead[item.id]) {
			iteration.pastItems++;
			continue;
		}
		log(`Processing item ${index}...`);
		itemsRead[item.id] = iteration.start;
		item.time = iteration.start;
		if (unwantedUsers.includes(item.user_id)) {
			iteration.unwantedUsers++;
			continue;
		}
		if (shouldDiscard(item.title)) {
			iteration.discardedItems++;
			continue;
		}
		const title = item.title.replaceAll(`#${item.user_login}`, '');
		const titleSets = [...title.matchAll(/[^0-9]*(\d{4,6})[^0-9]?\D*/g)].map(m => m[1]).filter(set => set > 2500);
		item.infer = {
			title: titleSets[0],
		};
		if (titleSets.length > 1) {
			item.infer.titleExtra = titleSets;
		}
		let viewItemReturn;
		if (!item.infer.title) {
			iteration.descriptionTest++;
			descriptionCache[item.user_id] = descriptionCache[item.user_id] || [];
			if (descriptionCache[item.user_id].length === 0) {
				descriptionCache[item.user_id] = await viewItem(item);
				iteration.vintedXhrs++;
			}
			viewItemReturn = descriptionCache[item.user_id].filter(i => i.id === item.id).map(i => ({
				...item,
				...i
			}))[0];
			// It may happen that the item is not found.
			// viewItemReturn = await viewItem(item);
		}
		if (viewItemReturn) {
			item = viewItemReturn;
			const description = item.description.replaceAll(`#${item.user_login}`, '');
			const descriptionSets = [...description.matchAll(/[^0-9]*(\d{4,6})[^0-9]?\D*/g)].map(m => m[1]).filter(set => set > 2500);

			item.infer.description = descriptionSets[0];
			if (descriptionSets.length > 1) {
				item.infer.descriptionExtra = descriptionSets;
			}
			
			if (shouldDiscard(item.description)) {
				iteration.discardedItems++;
				continue;
			}
		}
		if (!item.infer.title && !item.infer.description) {
			if (item.photos && item.photos.length > 0) {
				iteration.photoTest++;
				try {
					item.infer.photo = await lens(item.photos[0]); 
				} catch (e) {
					iteration.photoFailure++;
				}
			}
		}
		const cacheKey = item.infer.title || item.infer.description || item.infer.photo || 'undetermined';
		if (item.infer.title) {
			iteration.titleInfered++, iteration.addedItems++;
		} else if (item.infer.description) {
			iteration.descriptionInfered++, iteration.addedItems++;
		} else if (item.infer.photo) {
			iteration.photoInfered++, iteration.addedItems++;
		}
		log(item);
		log(cacheKey);
		if (unwantedSets[cacheKey]) {
			iteration.unwantedItems++;
		} else {
			itemsCache[cacheKey] = itemsCache[cacheKey] || [];
			itemsCache[cacheKey] = [...itemsCache[cacheKey], item].sort((a, b) => a.price > b.price);
			const maxPrice = prices[cacheKey];
			if (maxPrice > 0 && item.price < maxPrice) {
				iteration.possibleGold++;
				sendMail(cacheKey, item, maxPrice);
			}
		}
		persistData(itemsCache, itemsRead);
	}
	iteration.end = new Date();
	log(iteration);
	return iteration;
}
