/**
 * Submit sitemap URLs to IndexNow after build.
 * This script is best-effort: build must not fail if API is unavailable.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sitemapPath = resolve(__dirname, '../public/sitemap.xml');

const DEFAULT_KEY = 'f15d7d2cb7564a7fb4d02664227f2612';
const key = process.env.INDEXNOW_KEY || DEFAULT_KEY;
const host = process.env.INDEXNOW_HOST || 'nexora-truck.fr';
const endpoint = process.env.INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow';
const keyLocation =
  process.env.INDEXNOW_KEY_LOCATION || `https://${host}/${key}.txt`;

function extractUrls(xml) {
  const urls = [];
  const regex = /<loc>(.*?)<\/loc>/g;
  let match = regex.exec(xml);
  while (match) {
    urls.push(match[1]);
    match = regex.exec(xml);
  }
  return urls;
}

async function run() {
  if (!existsSync(sitemapPath)) {
    console.warn(`[indexnow] skipped: sitemap not found at ${sitemapPath}`);
    return;
  }

  const sitemap = readFileSync(sitemapPath, 'utf8');
  const urls = extractUrls(sitemap);

  if (urls.length === 0) {
    console.warn('[indexnow] skipped: no URLs found in sitemap');
    return;
  }

  const payload = {
    host,
    key,
    keyLocation,
    urlList: urls,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn(`[indexnow] warning: ${response.status} ${response.statusText} ${body}`);
      return;
    }

    console.log(`[indexnow] submitted ${urls.length} URLs to ${endpoint}`);
  } catch (error) {
    console.warn(`[indexnow] warning: request failed (${error?.message || error})`);
  }
}

run();
