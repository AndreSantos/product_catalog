import {readData} from '../../db/db.js';

const STRINGS_TO_TEST = [
    'pi146'
].map(str => 
    str.toLowerCase()
    .replaceAll(/\d+/ig, '')
    .replaceAll(/\s+/ig, ' ')
);

export async function testPersistedBadExpressions() {
	const data = readData();
	const badExpressions = data.badExpressions;

    for (let badExpression of badExpressions) {
        const tests = STRINGS_TO_TEST
            .map(str => !!str.match(badExpression))
            .map(res => res ? '!' : '.')
            .join(' ');
        console.log(`${badExpression.substr(0, 50)}: ${tests}`);
    }
}

testPersistedBadExpressions();