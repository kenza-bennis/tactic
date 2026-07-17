# Outillage

L'application n'a **aucune dépendance** : `index.html` est la source, il s'exécute tel quel. Ce dossier ne contient que ce qui sert à la fabriquer et à la vérifier — rien de tout cela n'est nécessaire pour l'utiliser ou l'héberger.

```bash
npm install          # puppeteer + les polices, pour les tests et les captures
```

## Tests

```bash
npm test             # les six suites
node test/run.mjs 04 # une seule
```

Cent vérifications, réparties en six suites. Elles parlent à l'application par ses propres fonctions (`score`, `normalize`, `cycleInfo`, `fitTrend`…) : le fichier étant unique et sans modules, tout est accessible depuis la page.

| Suite | Ce qu'elle protège |
|---|---|
| `01-score` | Les cinq profils somment à 120 · le plafond à 100 · un item à 0 disparaît · **une case vide n'est jamais un « non »** · la redistribution en grossesse préserve total et priorités |
| `02-migrations` | Un fichier v1, v3 ou v4 s'ouvre sans rien perdre · la fusion « distributeur + envies → grignotage » · **l'idempotence** : un sport supprimé ne revient pas |
| `03-cycle` | L'ovulation calculée à rebours ne bouge pas quand la durée des règles change · la médiane des fins marquées · les bornes des trimestres |
| `04-allure` | **Le plus important.** Les deux axes sont validés contre une vérité simulée : chacun échoue sur son propre scénario de dérive, l'alerte les rattrape, et la calibration tient (≈5 % de faux positifs sur témoin) |
| `05-compat` | iOS 15.0–15.3 sans `structuredClone` · stockage refusé · **un démarrage impossible explique au lieu d'afficher une page blanche** |
| `06-layout` | Aucun débordement : 4 largeurs × 4 situations × 4 écrans × 2 feuilles |

La suite `04-allure` mérite un mot. Elle ne vérifie pas que le code tourne — elle vérifie qu'**il ne raconte pas d'histoires**. On fabrique une coureuse dont la forme est connue, on y injecte des dérives, et on regarde si les modèles disent la vérité. C'est ce test qui justifie d'afficher un chiffre à quelqu'un.

## Logo

```bash
python3 logo.py      # nécessite Pillow
```

Régénère `logo.svg`, `icon.svg`, `favicon.svg` et les quatre PNG depuis une seule définition, puis **mesure la lisibilité** aux tailles réelles. Un logo invisible à 32 px est un logo raté : autant que la machine le dise.

## Captures

```bash
node screenshots.mjs
```

Sert l'application avec les polices du projet — sans ça, les captures sortent en polices système et ne ressemblent à rien — et remplit 105 jours de données par un tirage reproductible. Mêmes captures à chaque exécution.
