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

function log(str) {
	console.log(new Date().toLocaleString(), str);
}

async function getOrInitializeBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            // args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: '/usr/bin/chromium-browser',
            headless: true
        });
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

        const requestURL = 'https://lens.google.com';
        log('Photo inferrence: initial GDPR started.');
        await page.goto(requestURL);

        page.screenshot({path: '/tmp/photo-before-gdpr.png'});
        const elements = await page.evaluate("Array.from(document.querySelectorAll('button')).filter(el => el.textContent === 'Accept all' || el.textContent === 'Aceitar tudo')");
        log(elements);
        await page.evaluate("Array.from(document.querySelectorAll('button')).filter(el => el.textContent === 'Accept all' || el.textContent === 'Aceitar tudo')[0].click()");

        log('Photo inferrence: accepted Lens GDPR.');
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return page;
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
    
    log('Photo inferrence: started.');
    page.screenshot({path: `/tmp/photo-${idx}-0.png`});
    const imgExpanded = await page.evaluate("document.querySelector('button[aria-label*=\"Reduzir menu pendente\"]')");
    if (imgExpanded) {
        log('Photo inferrence: was searching another image, reset the state.');
        await page.evaluate("document.querySelector('button[aria-label*=\"Reduzir menu pendente\"]').click()");
        await new Promise(resolve => setTimeout(resolve, 500));
        page.screenshot({path: `/tmp/photo-${idx}-1.png`});
        await page.evaluate("document.querySelector('div[role=\"button\"][aria-label*=\"Pesquisa por imagem\"]').click()");
    }
    
    page.screenshot({path: `/tmp/photo-${idx}-2.png`});
    await page.locator('input').filter(input => input.placeholder === 'Colar link da imagem').wait();
    await page.locator('input').filter(input => input.placeholder === 'Colar link da imagem').fill(photoUrl);
    log('Photo inferrence: pasted photo URL.');
    
    await page.evaluate("Array.from(document.querySelectorAll('div[role=\"button\"]')).filter(el => el.textContent === 'Pesquisa')[0].click()");
    log('Photo inferrence: clicked on search.');

    await new Promise(resolve => setTimeout(resolve, 1000));
    page.screenshot({path: `/tmp/photo-${idx}-3.png`});
    await page.evaluate("Array.from(document.querySelectorAll('h2')).filter(el => el.textContent === 'Pesquisas relacionadas')[0].scrollIntoView()");
    log('Photo inferrence: scroll down.');
    await new Promise(resolve => setTimeout(resolve, 500));
    page.screenshot({path: `/tmp/photo-${idx}-4.png`});
    log('Photo inferrence: looking up values...');
    
    const PHOTO_REGEX = /\D*(\d{4,7})(?:$|\D*)/g;
    for (let i = 0; i < 15; i++) {
        page.screenshot({path: '/tmp/photo-' + i + '.png'});
        const results = await page.evaluate('Array.from(document.querySelectorAll(\'a[aria-label*="Lego"]\')).map(el => el.textContent)');
        if (results.length > 0) {
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
                log("Photo inferred:", maxv);
            } else {
                log("Didn't photo infer any sets.");
            }
            return result ? maxv : undefined;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    log('Photo inferrence: no values after 15s.');
    // page.screenshot('/tmp/photo15s.png');
    
    return undefined;
}

async function awaitSearchBox(page) {
    return await page.locator('input[placeholder="Paste image link"]').wait().fill();
    
    const input = await page.$('input[placeholder="Paste image link"]');
    if (input) {
        return input;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    return awaitSearchBox(page);
}
