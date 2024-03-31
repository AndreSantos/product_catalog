import fetch from 'node-fetch';
import UserAgent from 'user-agents';
import { fetchCookie } from './cookie.js';

export async function viewItem(item) {
  // Wait 500ms
  await new Promise(resolve => setTimeout(resolve, 500));

  const controller = new AbortController();
  const cookie = await fetchCookie();
  
  const url = `https://www.vinted.pt/api/v2/users/${item.user_id}/items?page=1&per_page=100&cond=active`;
  const vintedResponse = await fetch(url, {
    signal: controller.signal,
    headers: {
        cookie: '_vinted_fr_session=' + cookie,
        'user-agent': new UserAgent().toString(),
        accept: 'application/json, text/plain, */*'
    }
  });
  const response = await vintedResponse.json();
  return (response.items || []).map(i => ({
    id: i.id,
    description: i.description,
    discount: i.user.bundle_discount?.fraction,
    photos: i.photos.map(p => p.url),
    time: i.updated_at_ts,
  }));
  // return (response.items || []).filter(i => i.id === item.id).map(i => ({
  //  ...item,
  //  description: i.description,
  //  discount: i.user.bundle_discount?.fraction,
  //  photos: i.photos.map(p => p.url),
  //  time: i.updated_at_ts,
  // }))[0];
}
