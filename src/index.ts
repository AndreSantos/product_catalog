import {searchItems} from './vinted';

function init() {
	setInterval(() => {
		const date = new Date();
		console.log('Iteration', date);
	}, 1000);
}

// init();

async function iteration() {
	const items = await searchItems('lego');
	console.log(items);
}

iteration();
