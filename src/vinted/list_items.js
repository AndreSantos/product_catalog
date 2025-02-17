import fetch from 'node-fetch';
import UserAgent from 'user-agents';
import { fetchCookie } from './cookie.js';

export async function searchItems(query) {
  const controller = new AbortController();
  const cookie = await fetchCookie();
  const url = `https://www.vinted.pt/api/v2/catalog/items?search_text=${query.text}&catalog_ids=1499&order=newest_first&price_from=2&price_to=200`;
  const vintedResponse = await fetch(url, {
    signal: controller.signal,
    headers: {
        cookie: 'access_token_web=' + cookie,
        'user-agent': new UserAgent().toString(),
        accept: 'application/json, text/plain, */*'
    }
  });
  const response = await vintedResponse.json();
  // console.log("searchItems", cookie, response);
  return {
    time: (response.pagination || {}).time,
    items: (response.items || []).map(item => ({
      id: item.id,
      title: item.title,
      price: item.price.amount,
      brand: item.brand_title,
      discount: item.discount,
      status: item.status,
      url: item.url,
      user_id: item.user.id,
      user_login: item.user.login,
      photos: item.photo ? [item.photo.url] : [],
      firstPhotoDominantColor: item.photo?.dominant_color 
    }))
  };
}
