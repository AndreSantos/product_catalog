import {readData} from '../db/db.js';
import {sanitizeValue, extraSanitizationBeforeDiscardStep} from '../job/job.js';

const STRINGS_TO_TEST = [
    'pi146',
    'Lego astronaut Uit set 952405 2024'
];

function sanitizeStrings() {
    return STRINGS_TO_TEST.map(str => sanitizeValue(str, 'user_login'))
        .map(str => extraSanitizationBeforeDiscardStep(str));
}

function testPersistedBadExpressions() {
	const data = readData();
	const badExpressions = data.badExpressions;
    const stringsToTest = sanitizeStrings(STRINGS_TO_TEST);
    console.log("After sanitization:");
    console.log(stringsToTest);

    for (let badExpression of badExpressions) {
        const tests = stringsToTest
            .map(str => !!str.match(badExpression))
            .map(res => res ? '!' : '.')
            .join(' ');
        console.log(`${badExpression.source.substr(0, 50)}: ${tests}`);
    }
}

testPersistedBadExpressions();