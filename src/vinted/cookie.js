import fetch from 'node-fetch';
import UserAgent from 'user-agents';
import cookie from 'cookie';
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
    // console.log('Fetching cookie...');
    fetch(`https://vinted.pt`, {
      signal: controller.signal,
      agent,
      headers: {
        'user-agent': new UserAgent().toString()
      }
    }).then((res) => {
      const setCookie = res.headers.get('set-cookie');
      controller.abort();
      const parsedSetCookie = cookie.parse(setCookie);
      console.log("Fetch cookie", parsedSetCookie);
      const accessTokenWeb = parsedSetCookie.find(token => token.startsWith('access_web_token'));
      console.log("Access Token Web", accessTokenWeb);
      if (c) {
        vintedCookie = c;
      }
      resolve(vintedCookie);
    }).catch(() => {
      console.log('Fetching cookie failed.');
      controller.abort();
      reject();
    });
  });
}

export function clearVintedCookie() {
  vintedCookie = null;
}