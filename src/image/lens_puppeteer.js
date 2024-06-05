import randUserAgent from "rand-user-agent";
import cheerio from "cheerio";
import fetch from 'node-fetch';
import puppeteer from 'puppeteer-core';

let browser;
let page;

async function cleanup() {
    // Close browser.
    if (browser) {
        await browser.close();
        process.exit();
    }
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGQUIT', cleanup);

async function getOrInitializeBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            // args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: '/usr/bin/chromium-browser',
            headless: true
        });
        page = await browser.newPage();
        page.setDefaultNavigationTimeout(60000);

        const requestURL = 'https://lens.google.com';
        await page.goto(requestURL);

        let element = await page.waitForSelector('button[aria-label="Accept all"]');
        await element.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return page;
}

function log(str) {
	console.log(new Date().toLocaleString(), str);
}

export async function lens(photoUrl) {
    // const platform = ['mobile', 'desktop'];
    // const browser = ['chrome', 'safari', 'firefox'];
    // const agent = randUserAgent(platform[parseInt(Math.random() * 2)], browser[parseInt(Math.random() * 3)]);
    // const photoUrl = 'https://images1.vinted.net/t/02_000d4_ScrKgriPArjuD7x8XgehAcBg/f800/1707603544.jpeg?s=c59c1beb316ef167ebafee08efb8ae9c280bc103';
    const encodedURL = encodeURIComponent(photoUrl);
    const requestURL = `https://lens.google.com/uploadbyurl?re=df&url=${encodedURL}&hl=en&re=df&st=${+ new Date()}&ep=gisbubu`;
    let page = await getOrInitializeBrowser();
    log(requestURL);
    try {
        await page.goto(requestURL);
    } catch (e) {
        // Log error
        console.error(e);
        
        // Close browser and reinitialize.
        await browser.close();
        browser = undefined;
        page = await getOrInitializeBrowser();
        
        await page.goto(requestURL);
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const PHOTO_REGEX = /\D*(\d{4,7})(?:$|\D*)/g;
    for (let i = 0; i < 15; i++) {
        const results = await page.evaluate('Array.from(document.querySelectorAll(\'a[aria-label*="Lego"]\')).map(el => el.textContent)');
        if (results.length > 0) {
            //console.log(results);
            const freq = {};
            results.forEach(r => {
                const set = [...r.matchAll(PHOTO_REGEX)][0];
                if (set) {
                    freq[set[1]] = (freq[set[1]] ?? 0) + 1;
                }
            });
            // console.log(freq);
            let max = 1, maxv, total = 0;
            Object.keys(freq).forEach(r => {
                total += freq[r];
                if (freq[r] > max) {
                    max = freq[r] , maxv = r;
                }
            });
            // console.log(max, maxv);
            return max * 2 > total ? maxv : undefined;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return undefined;
}
