import randUserAgent from "rand-user-agent";
import cheerio from "cheerio";
import fetch from 'node-fetch';

const platform = ['mobile', 'desktop'];
const browser = ['chrome', 'safari', 'firefox'];

export async function lens(item) {
    const agent = randUserAgent(platform[parseInt(Math.random() * 2)], browser[parseInt(Math.random() * 3)]);
    const itemUrl = 'https://images1.vinted.net/t/02_000d4_ScrKgriPArjuD7x8XgehAcBg/f800/1707603544.jpeg?s=c59c1beb316ef167ebafee08efb8ae9c280bc103';
    const encodedURL = encodeURIComponent(itemUrl);
    const requestURL = `https://lens.google.com/uploadbyurl?re=df&url=${encodedURL}&hl=en&re=df&st=${+ new Date()}&ep=gisbubu`;
    
    let response = await fetch(requestURL, {
        body: null,
        method: "GET",
        mode: "cors",
        headers: {
            'user-agent': agent,
            'Accept-Language': 'pt-PT'
        }
      });
    // const redirectUrl = response.url;

    // response = await fetch(redirectUrl, {
    //     body: null,
    //     method: "GET",
    //     mode: "cors",
    //     headers: {
    //         'user-agent': agent,
    //         'Accept-Language': 'pt-PT'
    //     }
    //   });
    const body = await response.text();
    console.log(body);
    const $ = cheerio.load(body);
    const bricklinkHrefs = $('a[href*="www.bricklink"]').map((i, el) => {
        console.log(i, el, $(el).attr(' href'));

    });

    // const url = 'https://images1.vinted.net/t/02_000d4_ScrKgriPArjuD7x8XgehAcBg/f800/1707603544.jpeg?s=c59c1beb316ef167ebafee08efb8ae9c280bc103';
    // const result = await Tesseract.recognize(
    //     item.photos[0],
    //     'eng',
    //     { logger: m => {} }
    // );
    // return result.data.text;
    // .then(({ data: { text } }) => {
    //     console.log(text);
    // })
    
    // return await download.image({
    //     url: item.photos[id],
    //     dest: `${process.env.PWD}/tmp/${item.id}-${id}.jpeg` 
    // });
}