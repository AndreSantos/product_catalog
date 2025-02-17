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

        await resetTabsAndOpenLens();
    }
    return page;
}

export async function resetTabsAndOpenLens() {
    log(`Photo inferrence: closing ${pages.length} tabs.`);
    const pages = await browser.pages();
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

    log(`Photo inferrence: oepning lens.`);
    await page.goto('https://lens.google.com');
    waitMs(5000);
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
    await page.screenshot({path: `./logs/photo-${idx}-start.jpg`});
    waitMs(100);

    log('Photo inferrence: checking GDPR...');
    const gdprButton = await page.evaluate("Array.from(document.querySelectorAll('button')).filter(el => el.textContent === 'Accept all' || el.textContent === 'Aceitar tudo')[0]");
    if (gdprButton) {
        await page.evaluate("Array.from(document.querySelectorAll('button')).filter(el => el.textContent === 'Accept all' || el.textContent === 'Aceitar tudo')[0].click()");
        log('Photo inferrence: accepted Lens GDPR.');
        waitMs(1000);
    }
    
    try {
        await page.locator('button[aria-label*="Reduzir menu pendente"]')
            .setTimeout(500)
            .click();
        log('Photo inferrence: was searching another image, reset the state.');
        waitMs(1000);
    } catch(e) {
        log('Photo inferrence: state was already cleaned up.');
    }
    
    log('Photo inferrence: opening search box.');
    await page.waitForFunction(() => !!document.querySelector('div[role="button"][aria-label*="Pesquisar por imagem"]'));
    await page.evaluate(() => document.querySelector('div[role="button"][aria-label*="Pesquisar por imagem"]').click());
    waitMs(100);

    log('Photo inferrence: pasting photo URL.');
    await page.waitForFunction(() => !!document.querySelector('input[placeholder*="Colar link da imagem"]'));
    await page.evaluate((url) => document.querySelector('input[placeholder*="Colar link da imagem"]').value = url, photoUrl);
    log('Photo inferrence: pasted photo URL.');
    waitMs(100);
    
    // await page.waitForFunction(() => {
    //    return Array.from(document.querySelectorAll('div[role="button"]')).filter(el => el.textContent === 'Pesquisa').length > 0;
    //});
    //await page.evaluate(() => {
    //    Array.from(document.querySelectorAll('div[role="button"]')).filter(el => el.textContent === 'Pesquisa')[0].click();
    //});
    await page.evaluate(() => document.querySelector('input[placeholder*="Colar link da imagem"]').nextElementSibling.click());
    log('Photo inferrence: clicked on search.');
    waitMs(3000);

    log('Photo inferrence: hide image preview if opened.');
    try {
        await page.locator('button[aria-label*="Reduzir menu pendente"]')
            .setTimeout(15000)
            .click();
        log('Photo inferrence: hid image preview.');
        // Await same button not visible (using .clientHeight).
    } catch(e) {
        log('Photo inferrence: image preview not opened.');
    }
    waitMs(1000);
    log('Photo inferrence: looking up values...');
    await page.screenshot({path: `./logs/photo-${idx}-middle.jpg`});

    const PHOTO_REGEX = /Lego\D*(\d{4,7})(?:$|\D*)/ig;
    for (let i = 0; i < 5; i++) {
        const results = await page.evaluate("Array.from(document.querySelectorAll('div[role=\"heading\"][aria-level=\"3\"]')).map(el => el.textContent)");
        const resultsToLog = [...results];
        resultsToLog.length = Math.min(resultsToLog.length, 10);
        log(`Photo inferrence: frequencies attempt ${i}: `);
        log(resultsToLog);
        if (results.length >= 4) {
            const freq = {};
            results.forEach(r => {
                const set = [...r.matchAll(PHOTO_REGEX)][0];
                if (set) {
                    freq[set[1]] = (freq[set[1]] ?? 0) + 1;
                }
            });
            let max = 1, maxv, total = 0;

            Object.keys(freq).forEach(r => {
                total += freq[r];
                if (freq[r] > max) {
                    max = freq[r] , maxv = r;
                }
            });
            const result = max * 2 > total;
            if (result) {
                log(`Photo inferrence: ${maxv}`);
            } else {
                log("Photo inferrence: didn't photo infer any sets.");
            }
            
            await page.screenshot({path: `./logs/photo-${idx}-end.jpg`});
            return result ? maxv : undefined;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    log('Photo inferrence: no values after 5s.');
    
    page.screenshot({path: `./logs/photo-${idx}-end.jpg`});
    return undefined;
}

export async function takeErrorScreenshot() {
    const page = await getOrInitializeBrowser();
    const previousIdx = (idx > 0 ? idx : 20) - 1;
    page.screenshot({path: `./logs/photo-${previousIdx}-end.jpg`});
}
