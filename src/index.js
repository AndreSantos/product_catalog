import {searchItems} from './vinted.js';

function init() {
	setInterval(() => {
		const date = new Date();
		console.log('Iteration', date);
	}, 1000);
}

// init();

async function iteration() {
	const items = await searchItems({text: 'lego'});
	console.log(items);
}

iteration();
