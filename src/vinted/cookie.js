import fetch from 'node-fetch';
import UserAgent from 'user-agents';
import { HttpsProxyAgent } from 'https-proxy-agent';

let vintedCookie;

export function fetchCookie() {
  return new Promise((resolve, reject) => {
    if (vintedCookie) {
        return resolve(vintedCookie);
    }
    const controller = new AbortController();
    const agent = process.env.VINTED_API_HTTPS_PROXY ? new HttpsProxyAgent(process.env.VINTED_API_HTTPS_PROXY) : undefined;
    if (agent) {
      console.log(`[*] Using proxy ${process.env.VINTED_API_HTTPS_PROXY}`);
    }
    fetch(`https://vinted.pt`, {
      signal: controller.signal,
      agent,
      headers: {
        'user-agent': new UserAgent().toString()
      }
    }).then((res) => {
      controller.abort();
      const setCookie = res.headers.get('set-cookie');
      vintedCookie = setCookie.match(/access_token_web=([^;]*)/)[1];
      resolve(vintedCookie); 
    }).catch((err) => {
      console.error('Fetching cookie failed:', err);
      controller.abort();
      reject();
    });
  });
}

export function clearVintedCookie() {
  vintedCookie = null;
}