// Harnais commun : sert index.html en local et ouvre une page.
// Les tests parlent à l'application par ses propres fonctions (score, normalize, cycleInfo…),
// exposées globalement : c'est un fichier unique sans modules, on en profite.
import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

export const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

export async function open({ port = 8200, viewport = { width: 390, height: 844 }, ua, seed, before } = {}) {
  // On sert les vrais fichiers voisins : sinon le navigateur reçoit du HTML
  // à la place du manifeste et signale une erreur qui n'existe pas.
  const TYPES = { '.png': 'image/png', '.svg': 'image/svg+xml',
                  '.webmanifest': 'application/manifest+json',
                  '.js': 'text/javascript' };   // sinon le service worker reçoit du HTML
  const srv = http.createServer((q, r) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).slice(1));
    const ext = path.extname(f);
    if (TYPES[ext] && fs.existsSync(f)) {
      r.writeHead(200, { 'Content-Type': TYPES[ext] });
      return r.end(fs.readFileSync(f));
    }
    r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    r.end(HTML);
  }).listen(port);

  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {})
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message)));
  page.on('console', m => { if (m.type() === 'error' && !/40[34]|net::/.test(m.text())) errors.push(m.text()); });
  await page.setViewport(viewport);
  if (ua) await page.setUserAgent(ua);
  if (before) await page.evaluateOnNewDocument(before);
  if (seed) await page.evaluateOnNewDocument(v => localStorage.setItem('repere:v1', JSON.stringify(v)), seed);
  await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle0' });
  await wait(600);

  return { browser, page, errors, close: async () => { await browser.close(); srv.close(); } };
}

export const wait = ms => new Promise(r => setTimeout(r, ms));

/* Générateur reproductible : les tests ne doivent jamais dépendre du hasard. */
export const SEED_DATA = `
  window.__rnd = (s => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)(20260716);
  window.__gauss = () => { let u=0,v=0; while(!u) u=__rnd(); while(!v) v=__rnd();
    return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
`;

let pass = 0, fail = 0;
const lines = [];
export function ok(label, cond, detail = '') {
  (cond ? pass++ : fail++);
  lines.push(`  ${cond ? '✓' : '✗'} ${label}${detail ? ' — ' + detail : ''}`);
  if (!cond) lines.push(`      ÉCHEC`);
}
export function section(t) { lines.push(`\n▸ ${t}`); }
export function report(name) {
  console.log(`\n══ ${name} ══${lines.join('\n')}`);
  lines.length = 0;
  return { pass, fail };
}
export const totals = () => ({ pass, fail });
