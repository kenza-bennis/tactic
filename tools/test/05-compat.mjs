// Compatibilité et robustesse : vieux navigateurs, stockage refusé, écran d'erreur.
import { open, ok, section, report, IPHONE } from './lib.mjs';

section('Le document est bien formé');
{
  const tt = await open({ port: 8239 });
  const r = await tt.page.evaluate(() => {
    // Un attribut mal échappé déverse son contenu dans la page : on traque les nœuds orphelins.
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const strays = []; let n;
    while (n = w.nextNode()) {
      const t = n.textContent.trim(); if (!t) continue;
      if (n.parentElement.closest('nav,.bar,main,.sheet,.toast,script,style')) continue;
      strays.push(t.slice(0, 40));
    }
    return { strays, first: document.body.firstElementChild?.className || '',
             icon: (document.querySelector('link[rel=icon]') || {}).href || '' };
  });
  ok('aucun texte parasite dans le corps', r.strays.length === 0, r.strays.join(' | '));
  ok('le corps commence par la barre', r.first === 'bar', r.first);
  ok("l'URI de la favicon n'échappe pas de son attribut",
     !/["<>]/.test(r.icon.replace(/^data:image\/svg\+xml,/, '')), r.icon.slice(0, 46));
  await tt.close();
}

section('iOS 15.0–15.3 : structuredClone n\'existe pas encore');
let t = await open({ port: 8240, ua: IPHONE, before: () => { delete window.structuredClone; } });
ok('l\'application démarre quand même', await t.page.evaluate(() => !!document.querySelector('nav')));
const r = await t.page.evaluate(() => {
  const d = day(today(), true);
  d.sleep = 7.5; d.steps = 12000; d.water = 3; d.protein = 1; d.ultra = 0; d.snacking = 0;
  d.sessions = [{ type: 'Course', min: 45, rpe: 4, dist: 8 }]; d.periodStart = true; save();
  const n = normalize(JSON.parse(JSON.stringify(DB)));
  return { sc: typeof structuredClone, score: score(DB.days[today()]), v: n.version, phase: phaseOf(today()).phase };
});
ok('structuredClone bien absent', r.sc === 'undefined');
ok('saisie, score et migration identiques', r.score === 100 && r.v === 13 && r.phase === 'period');
ok('aucune erreur JS', t.errors.length === 0, t.errors.join(' | '));
await t.close();

section('Stockage refusé (navigation privée, aperçus intégrés)');
t = await open({ port: 8241, ua: IPHONE, before: () => {
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqué'); } });
} });
ok('l\'application démarre en mémoire au lieu de planter', await t.page.evaluate(() => !!document.querySelector('nav')));
ok('le diagnostic le signale', await t.page.evaluate(() => {
  openSheet(); renderDiag(); return /mémoire vive/.test($('#diag').textContent);
}));
await t.close();

section('Un démarrage impossible affiche une explication, pas une page blanche');
t = await open({ port: 8242, ua: IPHONE, before: () => {
  // on casse volontairement une dépendance du démarrage
  Object.defineProperty(window, 'matchMedia', { get() { throw new Error('panne simulée'); } });
} });
const f = await t.page.evaluate(() => ({
  nav: !!document.querySelector('nav'),
  msg: (document.querySelector('code') || {}).textContent,
  txt: document.body.innerText.slice(0, 60)
}));
ok('la navigation est remplacée par l\'écran d\'erreur', !f.nav && /démarrer/.test(f.txt), f.txt.trim());
ok('le message technique est affiché', !!f.msg, f.msg);
await t.close();

section('Diagnostic du stockage, iPhone');
for (const [label, standalone, attendu] of [
  ['onglet Safari → alerte des sept jours', false, /écran d'accueil/],
  ['écran d\'accueil → aucune alerte', true, null]
]) {
  const tt = await open({ port: 8243 + (standalone ? 1 : 0), ua: IPHONE,
    before: standalone ? () => Object.defineProperty(navigator, 'standalone', { get: () => true }) : undefined });
  const d = await tt.page.evaluate(() => { openSheet(); renderDiag();
    return { rows: $('#diag').textContent, warn: ($('#diag .warn') || {}).textContent || '' }; });
  ok(label, attendu ? attendu.test(d.warn) : !d.warn.includes('sept jours'));
  await tt.close();
}
export default report('Compatibilité et robustesse');
