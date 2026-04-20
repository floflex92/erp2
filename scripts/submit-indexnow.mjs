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
const rawEndpoints =
  process.env.INDEXNOW_ENDPOINTS ||
  process.env.INDEXNOW_ENDPOINT ||
  'https://yandex.com/indexnow';
const endpoints = rawEndpoints
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);
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

  let successfulSubmissions = 0;

  for (const endpoint of endpoints) {
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
        // Bing can reject domains not verified in Webmaster tools.
        // Keep this as informational if another endpoint accepts the submission.
        console.log(`[indexnow] endpoint skipped: ${endpoint} -> ${response.status} ${response.statusText} ${body}`);
        continue;
      }

      successfulSubmissions += 1;
      console.log(`[indexnow] submitted ${urls.length} URLs to ${endpoint}`);
    } catch (error) {
      console.log(`[indexnow] endpoint failed: ${endpoint} (${error?.message || error})`);
    }
  }

  if (successfulSubmissions === 0) {
    console.warn('[indexnow] warning: no endpoint accepted the submission');
  }
}

run();
