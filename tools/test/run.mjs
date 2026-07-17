#!/usr/bin/env node
// Lance toutes les suites. Sortie non nulle si quoi que ce soit échoue.
import { totals } from './lib.mjs';

const suites = ['01-score', '02-migrations', '03-cycle', '04-allure', '05-compat', '06-layout'];
const only = process.argv[2];

for (const s of suites) {
  if (only && !s.includes(only)) continue;
  await import(`./${s}.mjs`);
}
const { pass, fail } = totals();
console.log(`\n${'═'.repeat(40)}\n  ${pass} réussis · ${fail} échoués\n`);
process.exit(fail ? 1 : 0);
