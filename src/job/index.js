import {job} from './job.js';
import {readIterations, persistIterations} from '../db/db.js';

let nextIterationDate;
let nextIterationTimeout;
async function runJob() {
    nextIterationDate = undefined;
    nextIterationTimeout = undefined;
    
    const iterationStats = await job();
    const iterations = readIterations();
    iterations.push(iterationStats);
    persistIterations(iterations);

    let waitingTimeInMins;
    if (!iterationStats.totalItems) {
        clearVintedCookie();
        waitingTimeInMins = 7;
    } else if (iterationStats.pastItems < 5) {
		waitingTimeInMins = 7;
	} else if (iterationStats.pastItems < 10) {
		waitingTimeInMins = 10;
	} else if (iterationStats.pastItems < 20) {
		waitingTimeInMins = 12;
	} else if (iterationStats.pastItems < 30) {
		waitingTimeInMins = 16;
	} else {
		waitingTimeInMins = 25;
	}
    const isPrimeTime = iterationStats.end.getHours() >= 7 && iterationStats.end.getHours() <= 22;
    waitingTimeInMins *= isPrimeTime ? 1 : 2.5;

    const iterationLength = iterationStats.end - iterationStats.start;
    const waitingTime = waitingTimeInMins * 60 * 1000 - iterationLength;
    nextIterationDate = iterationStats.end.getTime() + waitingTime;
    nextIterationTimeout = setTimeout(() => runJob(), waitingTime);
}

runJob();