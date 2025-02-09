import randUserAgent from "rand-user-agent";
import cheerio from "cheerio";
import fetch from 'node-fetch';
import puppeteer from 'puppeteer-core';
import {execSync} from 'child_process';

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

function log(str) {
	console.log(new Date().toLocaleString(), str);
}

async function getOrInitializeBrowser() {
    if (!browser) {
        // Delete all screenshots
        execSync("rm -rf logs/*.jpg");

        browser = await puppeteer.launch({
            // args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: '/usr/bin/chromium-browser',
            headless: true
        });

        const pages = await browser.pages();
        log(`Photo inferrence: closing ${pages.length} tabs.`);
        for (const page of pages) {
            if (!await page.isClosed()) {
                await page.close();
            }
        }

        page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', request => {
            if (['image', 'font', 'other'].includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });
        page.setDefaultNavigationTimeout(60000);

        await page.goto('https://lens.google.com');
    }
    return page;
}

async function waitMs(ms) {
    return await new Promise(resolve => setTimeout(resolve, ms));
}

let idx = 0;

export async function lens(photoUrl) {
    // const platform = ['mobile', 'desktop'];
    // const browser = ['chrome', 'safari', 'firefox'];
    // const agent = randUserAgent(platform[parseInt(Math.random() * 2)], browser[parseInt(Math.random() * 3)]);
    // const photoUrl = 'https://images1.vinted.net/t/02_000d4_ScrKgriPArjuD7x8XgehAcBg/f800/1707603544.jpeg?s=c59c1beb316ef167ebafee08efb8ae9c280bc103';
    
    //const encodedURL = encodeURIComponent(photoUrl);
    //const requestURL = `https://lens.google.com/uploadbyurl?re=df&url=${encodedURL}&hl=en&re=df&st=${+ new Date()}&ep=gisbubu`;
    let page = await getOrInitializeBrowser();
    
    idx = (idx + 1) % 20;
    page.screenshot({path: `./logs/photo-${idx}-start.jpg`});
    await new Promise(resolve => setTimeout(resolve, 500));

    const bodyHandle = await page.$('body');

    log('Photo inferrence: accepted Lens GDPR.');
    await page.evaluate(body =>
        Array.from(body.querySelectorAll('button'))
                    .filter(el => el.textContent === 'Accept all' || el.textContent === 'Aceitar tudo')[0]?.click()
    , bodyHandle);
    waitMs(1000);
    
    log('Photo inferrence: started.');
    let imgPreview = await page.evaluate(body =>
        body.querySelector('button[aria-label*="Reduzir menu pendente"]'),
    bodyHandle);
    if (imgPreview) {
        log('Photo inferrence: was searching another image, reset the state.');
        await page.evaluate(body =>
            body.querySelector('button[aria-label*="Reduzir menu pendente"]').click(),
        bodyHandle);
        waitMs(500);
        log('Photo inferrence: reset done.');
    }        
    log('Photo inferrence: opening search box (if closed).');
    await page.evaluate("document.querySelector('div[role=\"button\"][aria-label*=\"Pesquisar por imagem\"]')?.click()");
    waitMs(3000);
    
    await page.evaluate(`document.querySelector('input[placeholder="Colar link da imagem"]').value = "${photoUrl}"`);
    log('Photo inferrence: pasted photo URL.');
    waitMs(1000);
    
    // await page.locator('input').filter(input => input.placeholder === 'Colar link da imagem').wait();
    // await page.locator('input').filter(input => input.placeholder === 'Colar link da imagem').fill(photoUrl);
    
    await page.evaluate("Array.from(document.querySelectorAll('div[role=\"button\"]')).filter(el => el.textContent === 'Pesquisa')[0].click()");
    log('Photo inferrence: clicked on search.');

    await new Promise(resolve => setTimeout(resolve, 4000));
    log('Photo inferrence: hide image preview if opened.');
    imgPreview = await page.evaluate("document.querySelector('button[aria-label*=\"Reduzir menu pendente\"]')?.click()");
    await new Promise(resolve => setTimeout(resolve, 500));
    log('Photo inferrence: looking up values...');
    
    const PHOTO_REGEX = /\D*(\d{4,7})(?:$|\D*)/g;
    for (let i = 0; i < 5; i++) {
        const results = await page.evaluate("Array.from(document.querySelectorAll('div[role=\"heading\"][aria-level=\"3\"]')).map(el => el.textContent)");
        if (results.length >= 4) {
            const freq = {};
            results.forEach(r => {
                const set = [...r.matchAll(PHOTO_REGEX)][0];
                if (set) {
                    freq[set[1]] = (freq[set[1]] ?? 0) + 1;
                }
            });
            log("Photo inferrence: frequencies ", freq);
            let max = 1, maxv, total = 0;

            Object.keys(freq).forEach(r => {
                total += freq[r];
                if (freq[r] > max) {
                    max = freq[r] , maxv = r;
                }
            });
            const result = max * 2 > total;
            if (result) {
                log("Photo inferrence:", maxv);
            } else {
                log("Photo inferrence: didn't photo infer any sets.");
            }
            
            page.screenshot({path: `./logs/photo-${idx}-end.jpg`});
            return result ? maxv : undefined;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    log('Photo inferrence: no values after 5s.');
    
    page.screenshot({path: `./logs/photo-${idx}-end.jpg`});
    return undefined;
}
