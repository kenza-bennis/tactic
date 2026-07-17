// Le score : barème, profils, plafond à 100, items à zéro, cases vides.
import { open, ok, section, report } from './lib.mjs';

const t = await open({ port: 8201 });
const { page } = t;

const perfect = () => page.evaluate(() => {
  DB.days[today()] = Object.assign(blank(), { sleep: 8, steps: 12000, water: 3, protein: 1,
    ultra: 0, snacking: 0, sessions: [{ type: 'Course', min: 45, rpe: 4, dist: 8 }] });
  return { score: score(DB.days[today()]), bareme: parts(DB.days[today()]).reduce((a, x) => a + x.p, 0) };
});

section('Les cinq profils somment à 120 et donnent 100 sur une journée parfaite');
for (const k of ['balance', 'endurance', 'muscu', 'fatloss', 'gentle']) {
  await page.evaluate(x => { S().weights = clone(PRESETS[x].w); save(); }, k);
  const r = await perfect();
  const n = await page.evaluate(x => PRESETS[x].n, k);
  ok(n, r.bareme === 120 && r.score === 100, `barème ${r.bareme}, score ${r.score}`);
}

section('Le barème change vraiment la lecture');
const partial = k => page.evaluate(x => {
  S().weights = clone(PRESETS[x].w);
  DB.days[today()] = Object.assign(blank(), { protein: 1, sessions: [{ type: 'Course', min: 45, rpe: 4, dist: 8 }] });
  return score(DB.days[today()]);
}, k);
const eq = await partial('balance'), mu = await partial('muscu');
ok('« séance + protéines » vaut plus en Musculation qu\'en Équilibre', mu > eq, `${eq} vs ${mu}`);

section('Cas limites du total');
for (const [label, w, expect] of [
  ['total 100 → aucune marge', { session: 30, steps: 20, water: 15, protein: 15, ultra: 5, snacking: 5, sleep: 5, load: 5 }, 100],
  ['total 80 → 100 inatteignable', { session: 30, steps: 20, water: 10, protein: 10, ultra: 5, snacking: 5, sleep: 0, load: 0 }, 80],
  ['total 200 → plafonné à 100', { session: 40, steps: 30, water: 25, protein: 25, ultra: 20, snacking: 20, sleep: 20, load: 20 }, 100]
]) {
  await page.evaluate(x => { S().weights = x; save(); }, w);
  const r = await perfect();
  ok(label, r.score === expect, `journée parfaite = ${r.score}`);
}

section('Un item à 0 disparaît du détail');
const z = await page.evaluate(() => {
  S().weights = clone(PRESETS.gentle.w);
  DB.days[today()] = Object.assign(blank(), { sleep: 8, sessions: [{ type: 'Course', min: 45, rpe: 5, dist: 8 }] });
  return parts(DB.days[today()]).some(x => x.k.includes('Charge'));
});
ok('profil « Reprise en douceur » (charge = 0) → charge retirée', !z);

section('Une case vide n\'est pas un « non »');
await page.evaluate(() => { S().weights = clone(DEF.settings.weights); save(); });
ok('jour vierge → score null', await page.evaluate(() => score(blank())) === null);
ok('jour avec une note seule → 0', await page.evaluate(() => { const d = blank(); d.notes = 'x'; return score(d); }) === 0);
ok('« ultra = non » + « grignotage = non » seuls → 20',
  await page.evaluate(() => score(Object.assign(blank(), { ultra: 0, snacking: 0 }))) === 20);

section('Redistribution en grossesse');
for (const k of ['balance', 'muscu']) {
  const r = await page.evaluate(x => {
    S().weights = clone(PRESETS[x].w); S().situation = 'pregnant'; save();
    const W = weights();
    return { tot: Object.values(W).reduce((a, b) => a + b, 0), prot: W.protein, ultra: W.ultra };
  }, k);
  ok(`${k} → total préservé, restrictions à zéro`, r.tot === 120 && r.ultra === 0, `total ${r.tot}, protéines ${r.prot}`);
}
ok('les priorités sont préservées (protéines dominantes en Musculation)',
  await page.evaluate(() => { S().weights = clone(PRESETS.muscu.w); S().situation = 'pregnant';
    const W = weights(); return W.protein === Math.max(...Object.values(W)); }));

ok('aucune erreur JS', t.errors.length === 0, t.errors.join(' | '));
await t.close();
export default report('Score et barème');
