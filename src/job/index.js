import {job} from './job.js';
import {readIterations, persistIterations} from '../db/db.js';
import {clearVintedCookie} from '../vinted/cookie.js';

async function runJob() {
    const iterationStats = await job();
    const iterations = readIterations();
    iterations.push(iterationStats);
    persistIterations(iterations);

    let waitingTimeInMins;
    if (!iterationStats.totalItems) {
        clearVintedCookie();
        waitingTimeInMins = 4;
    } else if (iterationStats.pastItems < 5) {
		waitingTimeInMins = 5;
	} else if (iterationStats.pastItems < 10) {
		waitingTimeInMins = 7;
	} else if (iterationStats.pastItems < 20) {
		waitingTimeInMins = 9;
	} else if (iterationStats.pastItems < 30) {
		waitingTimeInMins = 12;
	} else {
		waitingTimeInMins = 25;
	}
    const isPrimeTime = iterationStats.end.getHours() >= 7 && iterationStats.end.getHours() <= 22;
    const isSleepTime = iterationStats.end.getHours() >= 2 && iterationStats.end.getHours() <= 6;
    waitingTimeInMins *= isPrimeTime ? 1 : isSleepTime ? 3.5 : 2.5;

    const iterationLength = iterationStats.end - iterationStats.start;
    const waitingTime = waitingTimeInMins * 60 * 1000 - iterationLength;
    setTimeout(() => runJob(), waitingTime);
}

runJob();