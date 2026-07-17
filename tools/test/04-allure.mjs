// Les deux axes d'allure, validés contre une vérité simulée connue.
// C'est le test le plus important du lot : il vérifie qu'on ne raconte pas d'histoires.
import { open, ok, section, report } from './lib.mjs';

const t = await open({ port: 8230 });
const { page } = t;

/* Coureuse fictive. On fixe la vérité, on regarde ce que les modèles retrouvent.
   pousse    : son effort augmente au fil des mois (sans qu'elle progresse)
   indulgent : sa notation du RPE s'adoucit (sans que rien ne change)
   forme     : la vraie progression, en min/km par jour */
const sim = (pousse, indulgent, forme, seed = 5) => page.evaluate((P, I, F, SD) => {
  let s = SD; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  const G = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const rows = [];
  for (let t = 0; t <= 112; t += 4) {
    const eff = Math.min(5, Math.max(1, 3 + P * t + G() * 0.7));
    const rpe = Math.min(5, Math.max(1, Math.round(eff - I * t)));
    const km = 5 + rnd() * 8;
    rows.push({ s: 'x', p: 6.5 - 0.35 * (eff - 3) + 0.55 * Math.log(km / 8) + F * t + G() * 0.12, km, r: rpe, t });
  }
  const A = fitTrend(rows, 112, false);
  const B = fitTrend(rows.filter(x => x.r !== null), 112, true);
  const D = rpeDrift(rows);
  return { A: A.ok ? { g: -A.perMo, sig: A.signif } : null,
           B: B.ok ? { g: -B.perMo, sig: B.signif } : null,
           D: D.ok ? { d: D.perMo, sig: D.signif } : null };
}, pousse, indulgent, forme, seed);

section('Chaque axe échoue sur son propre scénario — et l\'alerte le rattrape');
let r = await sim(0.02, 0, 0);           // forme constante, elle pousse plus fort
ok('effort qui dérive → l\'axe « allure » annonce une fausse progression', r.A.g > 6, `${r.A.g.toFixed(1)} s/km/mois`);
ok('… mais l\'axe « à effort égal » tient', Math.abs(r.B.g) < 5, `${r.B.g.toFixed(1)} s`);
ok('… et l\'alerte de dérive se déclenche', r.D.sig, `${r.D.d.toFixed(2)} pt/mois`);

r = await sim(0, 0.012, 0);              // forme constante, sa notation s'adoucit
ok('notation qui dérive → l\'axe « allure » reste juste', Math.abs(r.A.g) < 4, `${r.A.g.toFixed(1)} s`);
ok('… mais l\'axe « à effort égal » ment', r.B.g > 3, `${r.B.g.toFixed(1)} s`);

section('Vraie progression, aucune dérive');
r = await sim(0, 0, -0.004, 42);         // vérité : -0,004 min/km/j = 7,2 s/km/mois
ok('les deux axes retrouvent la vérité (7,2 s/km/mois)',
  Math.abs(r.A.g - 7.2) < 4 && Math.abs(r.B.g - 7.2) < 4, `A ${r.A.g.toFixed(1)} · B ${r.B.g.toFixed(1)}`);
ok('l\'alerte reste muette', !r.D.sig, `${r.D.d.toFixed(2)} pt/mois`);

section('Calibration sur 200 réplications');
const cal = await page.evaluate(() => {
  const run = (P, I, F, N) => {
    let a = 0, b = 0, d = 0, n = 0;
    for (let k = 0; k < N; k++) {
      let s = k * 7919 + 13; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
      const G = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
      const rows = [];
      for (let t = 0; t <= 112; t += 4) {
        const eff = Math.min(5, Math.max(1, 3 + P * t + G() * 0.7));
        const rpe = Math.min(5, Math.max(1, Math.round(eff - I * t)));
        const km = 5 + rnd() * 8;
        rows.push({ s: 'x', p: 6.5 - 0.35 * (eff - 3) + 0.55 * Math.log(km / 8) + F * t + G() * 0.12, km, r: rpe, t });
      }
      const A = fitTrend(rows, 112, false), B = fitTrend(rows.filter(x => x.r !== null), 112, true), D = rpeDrift(rows);
      if (!A.ok || !B.ok || !D.ok) continue;
      n++; if (A.signif) a++; if (B.signif) b++; if (D.signif) d++;
    }
    return { A: 100 * a / n, B: 100 * b / n, D: 100 * d / n };
  };
  return { temoin: run(0, 0, 0, 200), pousse: run(0.02, 0, 0, 200), indulgent: run(0, 0.012, 0, 200), vraie: run(0, 0, -0.004, 200) };
});
ok('témoin : faux positifs au taux nominal (~5 %)',
  cal.temoin.A < 12 && cal.temoin.B < 12 && cal.temoin.D < 12,
  `A ${cal.temoin.A.toFixed(0)} % · B ${cal.temoin.B.toFixed(0)} % · alerte ${cal.temoin.D.toFixed(0)} %`);
ok('effort qui dérive : l\'alerte attrape presque toujours', cal.pousse.D > 90, `${cal.pousse.D.toFixed(0)} %`);
ok('notation qui dérive : l\'alerte attrape souvent', cal.indulgent.D > 60, `${cal.indulgent.D.toFixed(0)} %`);
ok('vraie progression : l\'axe B est plus sensible que l\'axe A',
  cal.vraie.B > cal.vraie.A, `A ${cal.vraie.A.toFixed(0)} % · B ${cal.vraie.B.toFixed(0)} %`);
ok('vraie progression : pas de fausse alerte', cal.vraie.D < 12, `${cal.vraie.D.toFixed(0)} %`);

section('Garde-fous');
const guard = async (P, I, why) => {
  const w = await page.evaluate((p, i) => {
    let s = 3; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
    const rows = [];
    for (let t = 0; t <= 112; t += 4) rows.push({ s: 'x', p: 6.5, km: 8, r: Math.min(5, Math.max(1, Math.round(1 + t / 28))), t });
    return fitTrend(rows, 112, true).why;
  }, P, I);
  return w;
};
ok('RPE corrélé au temps → refus explicite', (await guard()) === 'collin');
ok('moins de 8 séances → refus', await page.evaluate(() =>
  fitTrend([...Array(4)].map((_, i) => ({ s: 'x', p: 6, km: 8, r: 3, t: i * 10 })), 40, false).why) === 'few');
ok('moins de 21 jours → refus', await page.evaluate(() =>
  fitTrend([...Array(10)].map((_, i) => ({ s: 'x', p: 6 + i * .01, km: 8, r: 1 + i % 4, t: i })), 9, true).why) === 'short');

ok('aucune erreur JS', t.errors.length === 0, t.errors.join(' | '));
await t.close();
export default report('Allure et effort perçu');
