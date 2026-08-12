# AKT App

Webanwendung zur technischen Aktienanalyse mit WKN-/Aktiennameneingabe, Top-10-Übersicht und Detailanalyse.

## Funktionen

- Analyse von bis zu drei Wertpapieren
- WKN- und Namensvorschläge
- Technische Kennzahlen und Charts
- Top-10-Titel ab 90/100
- Aufklappbare Detailanalyse aus der Top-10
- Erklärung der wichtigsten Kennzahlen
- Kostenloses Hosting über GitHub Pages

## Entwicklung

Die Anwendung ist als statische Webanwendung ausgelegt. Es werden keine Build-Tools oder Frameworks benötigt. `index.html` enthält die Kernanwendung, `enhancements.js` optionale Erweiterungen und `top10.json` die vorab berechneten Top-10-Daten.

## Deployment

Pushes auf `main` werden automatisch über GitHub Actions auf GitHub Pages veröffentlicht.

Live: https://fabelicious.github.io/akt_app/
