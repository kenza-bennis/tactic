// Mise en page : rien ne doit déborder, sur aucun écran, dans aucune situation.
import { open, ok, section, report, wait } from './lib.mjs';

const SEED = () => {
  let s = 8; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 70; i++) {
    DB.days[addD(today(), -i)] = Object.assign(blank(), {
      sleep: 6 + rnd() * 3, energy: Math.ceil(rnd() * 5), mood: Math.ceil(rnd() * 5),
      steps: Math.round(5000 + rnd() * 8000), water: 2 + rnd(), protein: 1,
      ultra: rnd() < .3 ? 1 : 0, snacking: rnd() < .4 ? 1 : 0, weight: 60 + rnd(),
      social: { Instagram: Math.round(rnd() * 120), YouTube: Math.round(rnd() * 90), Substack: Math.round(rnd() * 30) },
      sessions: [{ type: 'Course', min: Math.round(25 + rnd() * 30), rpe: Math.ceil(rnd() * 5), dist: Math.round((4 + rnd() * 6) * 10) / 10 }]
    });
  }
  DB.days[addD(today(), -12)].periodStart = true;
  DB.days[addD(today(), -40)].periodStart = true;
  S().showBody = true; S().dueDate = addD(today(), 90); S().birthDate = addD(today(), -40);
  S().sports.push({ n: 'Un nom de sport délibérément très long', u: 'km' });
  S().socialApps.push('LinkedIn Learning & Formation');
  save();
};

let port = 8250;
for (const W of [320, 360, 390, 430]) {
  const t = await open({ port: port++, viewport: { width: W, height: 844 } });
  await t.page.evaluate(SEED);
  section(`${W} px`);
  for (const sit of ['cycles','amenorrhea','menopause','pregnant','postpartum','none']) {
    await t.page.evaluate(x => { S().situation = x; save(); }, sit);
    let over = 0;
    for (const v of ['day', 'week', 'stats', 'guide']) {
      await t.page.evaluate(x => go(x), v); await wait(400);
      if (v === 'guide') { await t.page.evaluate(() => $$('#guide details').forEach(d => d.open = true)); await wait(250); }
      over += await t.page.evaluate(() => [...document.querySelectorAll('main *')]
        .filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).length);
    }
    for (const open_ of ['openSheet', 'openHelp']) {
      await t.page.evaluate(x => window[x](), open_); await wait(400);
      over += await t.page.evaluate(() => [...document.querySelectorAll('.sheet.on *')]
        .filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).length);
      await t.page.evaluate(() => { closeHelp(); closeSheet(); }); await wait(250);
    }
    ok(`situation « ${sit} » — 4 écrans + 2 feuilles`, over === 0, over ? `${over} éléments débordent` : '');
  }
  ok('aucun défilement horizontal', !(await t.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  ok('aucune erreur JS', t.errors.length === 0, t.errors.join(' | '));
  await t.close();
}
export default report('Mise en page');
