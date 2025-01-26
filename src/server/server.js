import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import {execSync} from 'child_process';
import {readData, persistBadExpressions, persistPrices, persistUnwantedItems, persistUnwantedSets} from '../db/db.js';

const PAGE_SIZE = 500;

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

function createPage(items, pageNo) {
  const page = {};
  Object.keys(items).slice(pageNo * PAGE_SIZE, (pageNo + 1) * PAGE_SIZE).forEach(set => {
    page[set] = items[set];
  });
  return page;
}

function iterationViewData() {
  // let jobRunningIn;
  // if (nextIterationDate) {
  //   const timeToNextIterationInSeconds = (nextIterationDate - new Date().getTime()) / 1000;
  //   jobRunningIn = timeToNextIterationInSeconds > 60 ? `${Math.round(timeToNextIterationInSeconds / 60)} min` : `${Math.round(timeToNextIterationInSeconds)} sec`;
  // }
  return {
    isJobRunning: !!job_process,
    // jobRunningIn 
  }
}

export function initializeServer() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const port = 8080;
    const app = express();
    app.use('/logs', express.static(path.join(__dirname, '../../logs')));
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '/views'));
    
    app.get('/', (req, res) => {
      res.render('index', iterationViewData());
    });
    app.get('/run_job_now', (req, res) => {
      startJob();
      res.send('Done');
    });
    app.get('/screenshots', (req, res) => {
      const stdout = execSync("ls -t logs");
      const filenames = stdout.toString().split('.jpg').map(s => s.trim()).filter(s => s.length > 1);
      res.render('screenshots', {...iterationViewData(), items: filenames});
    });
    app.get('/users', (req, res) => {
      const data = readData();
      const users = {};
      const userLogins = {};
      Object.values(data.itemsCache).forEach(item => {
        userLogins[item.user_id] = item.user_login;
        users[item.user_id] = (users[item.user_login] || []);
        users[item.user_id].push(item);
      });
      const usersArray = [];
      Object.keys(users).forEach(userId => {
        if (users[userId].length > 1) {
          usersArray.push({id: userId, items: users[userId]});
        }
      });
      usersArray.sort((a,b) => b.items.length - a.items.length);

      res.render('users', {...iterationViewData(), usersArray, userLogins});
    });
    app.get('/bad_strings', (req, res) => {
      const data = readData();
      const items = data.badExpressions.map(expression => expression.source).concat(['']);

      res.render('bad_strings', {...iterationViewData(), items});
    });
    app.get('/bad_strings/:index', (req, res) => {
      const data = readData();
      const badStrings = data.badExpressions.map(expression => expression.source)
      const idx = req.params.index;
      const newBadString = req.query.value;
      if (idx < badStrings.length) {
        badStrings[idx] = newBadString;
      } else {
        badStrings.push(newBadString);
      }
      persistBadExpressions(badStrings);
      
      res.send(`Done.`);
    });
    
    app.get('/bad_strings/:index/unwanted', (req, res) => {
      const data = readData();

      const oldBadStrings = data.badExpressions;
      const badStrings = oldBadStrings
                          .filter((s, idx) => idx != req.params.index)
                          .map(expression => expression.source);
      persistBadExpressions(badStrings);
      
      res.send(`Done.`);
    });
    app.get('/prices', (req, res) => {
      const data = readData();
      const page = Number(req.query.page ?? '1');
      const itemsCount = Object.keys(data.prices).length;
      const prices = createPage(data.prices, page - 1);
      const paginationData = {
        itemsCount,
        page,
        pages: Math.ceil(itemsCount / PAGE_SIZE),
        url: '/prices?page='
      };
      res.render('prices', {prices, ...iterationViewData(), paginationData});
    });
    app.get('/unwanted_sets', (req, res) => {
      const data = readData();
      const page = Number(req.query.page ?? '1');
      const itemsCount = Object.keys(data.unwantedSets).length;
      const unwantedSets = createPage(data.unwantedSets, page - 1);
      const paginationData = {
        itemsCount,
        page,
        pages: Math.ceil(itemsCount / PAGE_SIZE),
        url: '/unwanted_sets?page='
      }
      res.render('unwanted_sets', {unwantedSets, ...iterationViewData(), paginationData});
    });
    app.get('/items', (req, res) => {
      const data = readData();
      const prices = data.prices;
      const items = {};
      const currentDate = new Date();
      Object.keys(data.itemsCache).filter(setStr => {
        if (["", "discarded", "undetermined"].includes(setStr)) {
          return false;
        }
        if (req.query.onlyNoPrice && prices[setStr]) {
          return false;
        }
        return true;
      }).forEach(key => {
        items[key] = data.itemsCache[key].map(i => {
          const item = i;
          if (item.created_ts) {
            interval = (currentDate - new Date(item.created_ts)) / (60 * 1000);
            if (interval < 60) {
              item.ago = interval.toFixed(0) + 'm';
            }
            interval /= 60;
            if (interval < 24) {
              item.ago = interval.toFixed(0) + 'h';
            }
            interval /= 24;
            item.ago = interval.toFixed(0) + 'd';
          }
          return item;
        });
      });
      res.render('items', {items, prices, ...iterationViewData()});
    });
    app.get('/discarded', (req, res) => {
      const data = readData();
      const discarded = data.itemsCache.discarded;
      res.render('discarded', {discarded, ...iterationViewData()});
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
