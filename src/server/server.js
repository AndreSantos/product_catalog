import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import {readBadStrings, readData, readIterations, persistIterations, persistPrices, persistUnwantedItems, persistUnwantedSets} from '../db/db.js';
import { spawn } from 'child_process';
import { createWriteStream } from 'node:fs';
import {job} from '../job.js';
import {clearVintedCookie} from '../vinted/cookie.js';

let job_process;
let job_start_time;

function uptime() {
  const now = new Date();
  const interval = Math.round((now - job_start_time) / 1000);
  if (interval < 60) {
    return `${interval} secs`;
  }
  interval = Math.round(interval / 60);
  // ... 
}

function startJob() {
  if (job_process) {
    return;
  }
  const logStream = createWriteStream('./src/server/logs/job.txt');
  job_process = spawn('npm', ['run', 'start']);
  
  job_process.stdout.pipe(logStream);
  job_process.stderr.pipe(logStream);

  job_process.on('exit', function (code, signal) {
    console.log(`Job process exited with code ${code} and signal ${signal}`);
    job_process = null;
  });
  job_start_time = new Date();
}

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

function iterationViewData() {
  let jobRunningIn;
  if (nextIterationDate) {
    const timeToNextIterationInSeconds = (nextIterationDate - new Date().getTime()) / 1000;
    jobRunningIn = timeToNextIterationInSeconds > 60 ? `${Math.round(timeToNextIterationInSeconds / 60)} min` : `${Math.round(timeToNextIterationInSeconds)} sec`;
  }
  return {
    isJobRunning: !!nextIterationDate,
    jobRunningIn 
  }
}

export function initializeServer() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const waitingTime = 5000;
    nextIterationDate = new Date().getTime() + waitingTime;
    nextIterationTimeout = setTimeout(() => {
      runJob();
    }, waitingTime);

    const port = 8080;
    const app = express();
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '/views'));
    
    app.get('/', (req, res) => {
      res.render('index', iterationViewData());
    });
    app.get('/run_job_now', (req, res) => {
      if (nextIterationTimeout) {
        clearTimeout(nextIterationTimeout);
      }
      startJob();
      res.send('Done');
    });
    app.get('/prices', (req, res) => {
      const data = readData();
      const prices = data.prices;
      res.render('prices', {prices, ...iterationViewData()});
    });
    app.get('/unwanted_sets', (req, res) => {
      const data = readData();
      const unwantedSets = data.unwantedSets;
      res.render('unwanted_sets', {unwantedSets, ...iterationViewData()});
    });
    app.get('/bad_strings', (req, res) => {
      const badStrings = readBadStrings();
      res.render('bad_strings', {badStrings, ...iterationViewData()});
    });
    app.get('/items/:theme?', (req, res) => {
      const data = readData();
      const prices = data.prices;
      const items = {};
      Object.keys(data.itemsCache).filter(setStr => {
        if (req.query.onlyNoPrice && prices[setStr]) {
          return false;
        }
        const set = parseInt(setStr);
        switch (req.params.theme) {
          // City
          case '60':
            return (set > 60000 && set < 70000) || (set > 7000 && set < 8000) || (set > 4000 && set < 4700);
          // Technic
          case '42':
            return (set > 42000 && set < 43000) || (set > 8000 && set < 9000);
          default:
            return true;
        }
      }).forEach(key => {
        items[key] = data.itemsCache[key];
      });
      res.render('items', {items, prices, ...iterationViewData()});
    });
    app.get('/discarded', (req, res) => {
      const data = readData();
      const discarded = data.itemsCache.discarded;
      res.render('discarded', {discarded});
    });
    app.get('/iterations', (req, res) => {
      const data = readData();
      const iterations = data.iterations;
      res.render('iterations', {iterations, ...iterationViewData()});
    });

    app.get('/item/:itemId/price/:price', (req, res) => {
      const data = readData();
      const prices = data.prices;
      if (Number.isNaN(req.params.price)) {
        delete prices[req.params.itemId];
        res.send(`Price of Set ${req.params.itemId} was deleted.`);
      } else {
        prices[req.params.itemId] = parseInt(req.params.price);
        res.send(`Price of Set ${req.params.itemId} changed to ${req.params.price} Eur.`);
      }
      persistPrices(prices);
    });
    app.get('/set/:setId/unwanted', (req, res) => {
      const data = readData();

      const unwantedSets = data.unwantedSets;
      unwantedSets[req.params.setId] = true;
      persistUnwantedSets(unwantedSets);
      
      res.send(`Done.`);
    });
    app.get('/item/:itemId/unwanted', (req, res) => {
      const data = readData();
      data.unwantedItems[req.params.itemId] = true;
      persistUnwantedItems(data.unwantedItems);
      res.send(`Done.`);
    });
    app.get('/js/app.js',function(req,res) {
      res.sendFile(path.join(__dirname + '/js/app.js')); 
    });
    
    const server = app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });    
    process.on('SIGTERM', () => server.close(0));
    process.on('SIGINT', () => server.close(0));
}


initializeServer();
