// Le cycle : phases calculées à rebours, durée des règles par cycle, grossesse, post-partum.
import { open, ok, section, report, wait } from './lib.mjs';

const t = await open({ port: 8220 });
const { page } = t;
const mk = (off, st, en) => page.evaluate((o, a, b) => {
  DB.days[addD(today(), -o)] = Object.assign(blank(), { periodStart: a, periodEnd: b }); save();
}, off, st, en);
const info = off => page.evaluate(o => { const c = cycleInfo(addD(today(), -o));
  return { day: c.day, phase: c.phase, ov: c.ov, L: c.L, pLen: c.pLen, pMarked: c.pMarked }; }, off);

section('Durée des règles par cycle');
await page.evaluate(() => { Object.keys(DB.days).forEach(k => delete DB.days[k]); save(); });
await mk(10, true, false);
let c = await info(10);
ok('sans fin marquée → valeur par défaut', c.pLen === 5 && !c.pMarked, `${c.pLen} j`);
await mk(8, false, true);
c = await info(10);
ok('fin marquée à J3 → règles de 3 jours', c.pLen === 3 && c.pMarked);
ok('l\'ovulation ne bouge pas (calculée à rebours)', c.ov === 14, `J${c.ov}`);
ok('J4 passe de « règles » à « folliculaire »', (await page.evaluate(() => cycleInfo(addD(today(), -7)).phase)) === 'follicular');

section('Une seule fin par cycle — invariant tenu par le bouton');
await page.evaluate(() => { curDay = addD(today(), -6); renderDay(); });   // J5
await page.click('#pEnd'); await wait(300);
ok('re-marquer ailleurs déplace la fin', await page.evaluate(() => ends().length) === 1);
ok('la durée suit', (await info(10)).pLen === 5);
ok('décocher revient à l\'estimation', await (async () => {
  await page.click('#pEnd'); await wait(300);
  return !(await info(10)).pMarked;
})());
// et si une sauvegarde importée contenait deux fins, la dernière du cycle fait foi
ok('deux fins importées → la dernière du cycle fait foi', await page.evaluate(() => {
  DB.days[addD(today(), -8)].periodEnd = true;
  DB.days[addD(today(), -6)].periodEnd = true;
  return cycleInfo(addD(today(), -10)).pLen === 5;
}));

section('Médiane des fins marquées pour les cycles non marqués');
await page.evaluate(() => {
  Object.keys(DB.days).forEach(k => delete DB.days[k]);
  const m = (o, a, b) => DB.days[addD(today(), -o)] = Object.assign(blank(), { periodStart: a, periodEnd: b });
  m(90, true, false); m(88, false, true);   // 3 j
  m(62, true, false); m(59, false, true);   // 4 j
  m(34, true, false);                       // non marqué
  save();
});
const med = await page.evaluate(() => ({ obs: obsPeriodLens(), typ: typicalPeriod(),
  c1: cycleInfo(addD(today(), -90)).pLen, c3: cycleInfo(addD(today(), -34)).pLen }));
ok('les cycles marqués gardent leur vraie durée', med.c1 === 3, `[${med.obs}]`);
ok('le cycle non marqué prend la médiane', med.c3 === med.typ, `${med.c3} j`);

section('Grossesse');
await page.evaluate(() => { Object.keys(DB.days).forEach(k => delete DB.days[k]);
  S().situation = 'pregnant'; S().dueDate = addD(today(), 112); save(); });
const pg = await page.evaluate(() => pregInfo(today()));
ok('112 jours avant terme → 24 SA', pg.sa === 24 && pg.tri === 2, `${pg.sa} SA + ${pg.d} j, T${pg.tri}`);
for (const [off, sa, tri] of [[270, 1, 1], [190, 12, 1], [60, 31, 3], [0, 40, 3]]) {
  const r = await page.evaluate(o => { S().dueDate = addD(today(), o); return pregInfo(today()); }, off);
  ok(`terme dans ${off} j → ${sa} SA, T${tri}`, r.sa === sa && r.tri === tri, `${r.sa} SA, T${r.tri}`);
}
ok('l\'indice d\'allure est désactivé', await page.evaluate(() => { renderPace(); return $('#pace').textContent.includes('Désactivé'); }));

section('Post-partum');
await page.evaluate(() => { S().situation = 'postpartum'; S().birthDate = addD(today(), -58); S().thresholds.sleep = 7.5; save(); });
const pp = await page.evaluate(() => ppInfo(today()));
ok('58 jours → 8 semaines', pp.w === 8);

section('Situation « rien de tout ça »');
await page.evaluate(() => { S().situation = 'none'; save(); });
ok('aucune phase renvoyée', await page.evaluate(() => phaseOf(today()).phase) === null);
ok('aucune erreur JS', t.errors.length === 0, t.errors.join(' | '));
await t.close();
export default report('Cycle, grossesse, post-partum');
