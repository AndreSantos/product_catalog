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
      // Fix Vinted cookies bug.
      const sessionCookie = res.headers.get('set-cookie').replace('Lax,', 'Lax;');
      controller.abort();
      const c = cookie.parse(sessionCookie)['_vinted_fr_session'];
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