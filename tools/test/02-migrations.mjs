// Les migrations : un ancien fichier doit s'ouvrir sans rien perdre, et ne migrer qu'une fois.
import { open, ok, section, report, wait } from './lib.mjs';

section('Chaînes de migration vers la version courante');
const cas = [
  ['v1 · aucun réglage', { version: 1, settings: {}, days: {}, weeks: {} }, 'cycles'],
  ['v3 · cycleEnabled: false', { version: 3, settings: { cycleEnabled: false }, days: {}, weeks: {} }, 'none'],
  ['v3 · cycleEnabled: true', { version: 3, settings: { cycleEnabled: true }, days: {}, weeks: {} }, 'cycles'],
  ['v4 · cycle: none', { version: 4, settings: { cycle: 'none' }, days: {}, weeks: {} }, 'none']
];
let port = 8210;
for (const [label, seed, attendu] of cas) {
  const t = await open({ port: port++, seed });
  const r = await t.page.evaluate(() => ({ v: DB.version, sit: S().situation, purge: S().cycle === undefined && S().cycleEnabled === undefined }));
  ok(label, r.sit === attendu && r.purge, `→ situation « ${r.sit} », anciens champs purgés`);
  await t.close();
}

section('v3 → v4 : « distributeur » et « envies » fusionnent en « grignotage »');
const t = await open({ port: port++, seed: { version: 3,
  settings: { cycleEnabled: true, sports: [{ n: 'Course', u: 'km' }] },
  days: {
    '2026-07-01': { sleep: 8, steps: 11000, water: 3, protein: 1, ultra: 0, workFood: 0, cravings: 0, sessions: [{ type: 'Course', min: 40, rpe: 4, dist: 8 }] },
    '2026-07-02': { sleep: 7, workFood: 1, cravings: 0 },
    '2026-07-03': { sleep: 7, workFood: 0, cravings: 1 },
    '2026-07-04': { sleep: 7 }
  }, weeks: {} } });
const g = k => t.page.evaluate(x => DB.days[x].snacking, k);
ok('non + non → non', await g('2026-07-01') === 0);
ok('oui + non → oui', await g('2026-07-02') === 1);
ok('non + oui → oui', await g('2026-07-03') === 1);
ok('ni l\'un ni l\'autre → vide', await g('2026-07-04') === null);
ok('anciens champs supprimés', await t.page.evaluate(() => DB.days['2026-07-01'].workFood === undefined));
ok('score d\'un jour v3 préservé', await t.page.evaluate(() => score(DB.days['2026-07-01'])) === 100);

section('Idempotence');
ok('normalize deux fois de suite donne le même résultat', await t.page.evaluate(() => {
  const a = normalize(JSON.parse(JSON.stringify(DB)));
  const b = normalize(JSON.parse(JSON.stringify(a)));
  return JSON.stringify(a.settings.sports) === JSON.stringify(b.settings.sports);
}));
ok('un sport supprimé volontairement ne revient pas', await t.page.evaluate(() => {
  S().sports = S().sports.filter(x => x.n !== 'Vélo');
  return !normalize(JSON.parse(JSON.stringify(DB))).settings.sports.some(x => x.n === 'Vélo');
}));
ok('le barème personnalisé survit à un aller-retour', await t.page.evaluate(() => {
  S().weights = { session: 35, steps: 0, water: 15, protein: 25, ultra: 10, snacking: 10, sleep: 15, load: 10 };
  return normalize(JSON.parse(JSON.stringify(DB))).settings.weights.steps === 0;
}));
ok('aucune erreur JS', t.errors.length === 0, t.errors.join(' | '));
await t.close();
export default report('Migrations');
