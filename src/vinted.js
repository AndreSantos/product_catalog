import fetch from 'node-fetch';
import UserAgent from 'user-agents';
import cookie from 'cookie';
import { HttpsProxyAgent } from 'https-proxy-agent';

const cookies = new Map();

const fetchCookie = () => {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const agent = process.env.VINTED_API_HTTPS_PROXY ? new HttpsProxyAgent(process.env.VINTED_API_HTTPS_PROXY) : undefined;
    if (agent) {
      console.log(`[*] Using proxy ${process.env.VINTED_API_HTTPS_PROXY}`);
    }
    // console.log('Fetching cookie...');
    fetch(`https://vinted.pt`, {
      signal: controller.signal,
      agent,
      headers: {
        'user-agent': new UserAgent().toString()
      }
    }).then((res) => {
      // Fix Vinted cookies bug.
      const sessionCookie = res.headers.get('set-cookie').replace('Lax,', 'Lax;');
      controller.abort();
      const c = cookie.parse(sessionCookie)['_vinted_fr_session'];
      if (c) {
        cookies.set('pt', c);
      }
      resolve();
    }).catch(() => {
      console.log('Fetching cookie failed.');
      controller.abort();
      reject();
    });
  });
}

export async function searchItems(query) {
  const controller = new AbortController();
  const c = cookies.get('pt') ?? process.env[`VINTED_API_PT_COOKIE`];
  if (c) {
    console.log(`[*] Using cached cookie for .pt`);
  } else {
    console.log(`[*] Fetching cookie for .pt`);
    await fetchCookie().catch(() => {});
  }
  const url = `https://www.vinted.pt/api/v2/catalog/items?search_text=${query.text}&order=newest_first`;
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
        cookie: '_vinted_fr_session=' + cookies.get('pt'),
        'user-agent': new UserAgent().toString(),
        accept: 'application/json, text/plain, */*'
    }
});
  const items = await response.json();
  for (const itemId in items) {
    const item = items[itemId];
    console.log(item);
        
    // const itemTitle = item.title;
    // const itemPrice = item.price;
    // const itemImageUrl = item.photo.url;
    // const date = new Date(item.photo.high_resolution.timestamp * 1000);
    // const timestamp = date.getHours() + ':' + ("0" + date.getMinutes()).slice(-2) + ':' + ("0" + date.getSeconds()).slice(-2);
    // const itemUrl = item.url;
    // const vendorName = item.user.login;
    }
}
