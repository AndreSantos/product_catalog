import {searchItems} from '../vinted/list_items.js';
import {viewItem} from '../vinted/view_item.js';
import {readData, persistData} from '../db/db.js';
import {lens} from '../image/lens_puppeteer.js';
import {sendMail} from './mail.js';

const BAD_STRINGS = [
	// MOC
	'MOC',
	// Only Instructions
	/solo (manuali|instrucciones|istruzioni)/i,
	/^libretto istruzioni/i,
	/^(libretto|istruzioni) (\S+\s+)?Lego/i,
	/^Lego istruzioni/i,
	'notices Lego',
	'carte Lego',
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
	/^Instrucciones(\s+y\s+pegatinas)?/i,
	// Catalog, maganizes
	/^(Catalog|Catálogo)s?\s+(-\s+)?Lego/i,
	/^Lego\s+(\S+\s+)?magazine/i, 
	// Only Box
	/(Only|Solo) (Box|Scatola)/i,
	/Bo(i|î)te(s)? vide/i,
	/(Scatole vuote|Scatola vuota|Caixa vazia)/i,
	// Wall Support
	/^(Lego )?(Supporto|Stand)/i,
	/^Support\s+Lego/i,
	/Vitrina/i,
	// Misc Lego
	'Lego lotto da ',
	// Only Minifigs
	/lot\s*(de\s+\d+)\s*(mini)?figurines/i,
	/(minifig|minifigure|minifigura|Figurine)s?\s+(\S+\s+)?(Lego|Compatible)/i,
	/^(minifig|minifigure|minifigura|Figurine|Figura)/i,
	/Lego\s+(\S+\s+)?(minifig|minifigure|minifigura|Figurine)s?/i,
	/(cas|col|cty|hol|hp|loc|lor|mar|njo|pi|sh|sp|sw)\d{3,6}/i,
	/^Vend personnage/i,
	// No Minifigs,
	/(no|sans) (figurines|minifigures|personnage)/i,
	// Baseplate
	/^Lego\s+(\d+\s+)?(Basisplaat|Baseplate|wege?n?plate?n?|grondplaat|plaque|pièces?|pieces?)/i,
	/^(Baseplate|grondplaat|plaque|pièces?|pieces?|Base)\s+(\S+\s+)?Lego/i,
	/Solo la struttura/i,
	// Animals, Parts
	/\d{4}(bpb|c|p|pb|px)\d{1,3}/i,
	/^(Accessoires|Accessorios) Lego/i,
	/^Lot d'accessoires/i,
	/^Lot de plate/i,
	// Telecommande
	/^T\Sl\Scommande/i,
	// Lights
	/Light My Bricks/i,
	/^Led\s+/i,
	/Kit\s+Led\s+pour/i,
	// Polybag
	'polybag',
	// DVD
	/(Dvd|videogame|Nintendo|Jeu switch|Jeu vid|Playstation|PS3|Xbox|wii)/i,
	// Keys
	/(Portachiavi|sleutelhanger|keychain)/i,
	/porte.?cl(e|é)/i,
	// Clothing
	/verkleedset/i,
	"Veste de ski",
	/Adidas (ZX|Ultraboost)/i,
	/(Chaqueta|Toalla|pyjama)/i,
	/Costume\s+(\S+\s+)?Lego/i,
	/De?é?guisement/i,
	/(Tee-?|T-?)shirt/i,
	/(nachtlamp|orologio)/i,
	// Non-Lego
	/(Genre|Tipo|Type|Style|Compatible|Compatível|compatibili|Compatibile|Replica|non originale)s?\s+(\S+\s+)?lego/i,
	/lego\s+(\S+\s+)?(Genre|Tipo|Type|Style|Compatible|Compatível|compatibili|Compatibile|Replica|non originale)s?/i,
	/Compatibile o simile/i,
	/(Ensemble Playmobil|^Playmobil)/i,
	/pas de (la marque|vrais) Lego/i,
	/pas de Lego/i,
	/pas compatible/i,
	/lego no oficial/i,
	/Geen originele/i,
	'Figurine Compatible',
	'Briques de construction',
	/(Montini|Lepin|mini lego|lego girls|abrick|Mould king|guerra|Jie Star|Blocki|Urba?e?n artic)/i,
	/M(e|é)ga bloc?ks/i,
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

function sanitizeValue(str, user_login) {
	return str.replaceAll(`#${user_login}`, '').replace(/anné?e?e[^a-zA-Z0-9-]+\d{4}/i,'').replace(/\d{4,5}\s+piè?e?ces/i,'');
}

function shouldDiscard(str) {
	const s = str.toLowerCase();
	return BAD_STRINGS.some(bad => bad instanceof RegExp ? !!s.match(bad) : s.includes(bad.toLowerCase()));
}

function shouldDiscardBrand(brand) {
	if (!brand || brand.trim().length === 0) {
		return false;
	}
	const isLego = !!brand.match(/lego/i);
	return !isLego;
}

function getInferredSets(item) {
	return item.infer.title.length > 0 ?
			item.infer.title :
			(item.infer.description.length > 0 ?
				item.infer.description :
				item.infer.photo);
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
	console.log('isPossibleGold', cacheKey, maxPrice, hasAtLeastOneItemWithPrice);
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
		if (itemsRead[item.id]) {
			iteration.pastItems++;
			continue;
		}
		log(`Processing item ${index}...`);
		itemsRead[item.id] = iteration.start;
		item.time = iteration.start;
		if (unwantedUsers.includes(item.user_id) || unwantedUsers.includes(item.user_login)) {
			iteration.unwantedUsers++;
			continue;
		}
		if (shouldDiscard(item.title) || shouldDiscardBrand(item.brand)) {
			iteration.discardedItems++;
			continue;
		}
		const title = sanitizeValue(item.title, item.user_login);
		const titleSets = [...title.matchAll(/[^0-9]*(\d{4,7})[^0-9]?\D*/g)].map(m => m[1]);
		item.infer = {
			title: titleSets,
		};
		const couldBeGoldFromTitle = isPossibleGold(item, prices);
		let viewItemReturn;
		log(`Inferred sets ${item.infer.title} and gold from title: ${couldBeGoldFromTitle}`);
		if (!item.infer.title.length || couldBeGoldFromTitle) {
			log(`Fetching description`);
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
		}
		if (viewItemReturn) {
			item = viewItemReturn;
			const description = sanitizeValue(item.description, item.user_login);
			const descriptionSets = [...description.matchAll(/[^0-9]*(\d{4,7})[^0-9]?\D*/g)].map(m => m[1]);

			item.infer.description = descriptionSets;
			
			if (shouldDiscard(item.description)) {
				iteration.discardedItems++;
				continue;
			}
		}
		if (!item.infer.title.length && !item.infer.description.length) {
			if (item.photos && item.photos.length > 0) {
				iteration.photoTest++;
				try {
					item.infer.photo = await lens(item.photos[0]); 
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
		
		log(item);
		if (areAllUnwantedItems) {
			log(`Unwanted item ${areAllUnwantedItems}`);
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
