// Cloned from https://github.com/MrBalourd/Vinted-API

import puppeteer from  "puppeteer-core";
//const puppeteer = require("puppeteer-core");
// const browser = await puppeteer.launch({ executablePath: "chromium-browser" });


export async function searchItems(query: {text: string}) {
	const url = `https://www.vinted.pt/catalog?search_text=${query.text}&order=newest_first&price_to=250&currency=EUR`;
    const result = [];
    // const browser = await puppeteer.launch({headless: "new"});
    const browser = await puppeteer.launch({ executablePath: "/usr/bin/chromium-browser" });
    const page = await browser.newPage();
    await page.setRequestInterception(true);

    page.on('request', (req) => {
        console.log("onRequest", req);
        if(req.resourceType() === 'stylesheet' || req.resourceType() === 'font'){
            req.abort();
        }
        else {
            req.continue();
        }
    });

    await page.goto(url);

    const itemsBased = await page.evaluate(() => {
      console.log("pageEvaluate", document.querySelector("*"));
      return document.querySelector('script[data-js-react-on-rails-store="MainStore"]')!.textContent;
    });
    const itemsParsed = JSON.parse(itemsBased!);
    const items = itemsParsed.items.catalogItems.byId;

    
    for (const itemId in items) {
        const item = items[itemId];
        
        const vendorName = item.user.login;
        const itemTitle = item.title;
        const itemPrice = item.price;
        const itemImageUrl = item.photo.url;
        const date = new Date(item.photo.high_resolution.timestamp * 1000);
        const timestamp = date.getHours() + ':' + ("0" + date.getMinutes()).slice(-2) + ':' + ("0" + date.getSeconds()).slice(-2);
        const itemUrl = item.url;

        result.push({
            vendorName: vendorName,
            itemTitle: itemTitle,
            itemPrice: itemPrice,
            itemImageUrl: itemImageUrl,
            timestamp: timestamp,
            url: itemUrl
        });
    }
    await browser.close();
    return result;
}
