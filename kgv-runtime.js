(function () {
  'use strict';

  /*
   * AKT-Pro – KGV isolierter Funktionstest
   *
   * WICHTIG:
   * Dieses Modul verändert NICHT:
   * - Scoring
   * - Kursdaten
   * - Charts
   * - WKN-Auflösung
   * - Handelsplatz
   * - Top 10
   *
   * Zweck dieses Tests:
   * Zuerst sicherstellen, dass die KGV-Anzeige
   * technisch in der Einzelanalyse funktioniert.
   */

  function getTestKgv(symbol) {
    symbol = String(symbol || '').trim().toUpperCase();

    /*
     * Sicherer Test mit Amazon.
     * Wenn AMZN analysiert wird, muss "KGV: 27"
     * sichtbar werden.
     *
     * Dieser Wert ist NUR ein Funktionstest und
     * noch KEIN echter Live-KGV-Wert.
     */
    if (symbol === 'AMZN') {
      return 27;
    }

    return null;
  }

  function addKgv(group, value) {
    if (!group) {
      return;
    }

    if (!Number.isFinite(Number(value))) {
      return;
    }

    /*
     * Die vorhandene Kachel "Technische Empfehlung"
     */
    const target =
      group.querySelector('.card.wide .score') ||
      group.querySelector('.score');

    if (!target) {
      return;
    }

    /*
     * Bereits vorhandene Anzeige entfernen,
     * damit nichts doppelt erscheint.
     */
    const old = group.querySelector('.kgv-value');

    if (old) {
      old.remove();
    }

    const kgv = document.createElement('span');

    kgv.className = 'kgv-value';

    kgv.style.cssText = [
      'display:inline-block',
      'margin-left:12px',
      'font-size:14px',
      'font-weight:800',
      'white-space:nowrap'
    ].join(';');

    kgv.textContent = 'KGV: ' + value;

    target.insertAdjacentElement('afterend', kgv);
  }

  function scan() {

    const groups =
      document.querySelectorAll('.stock-group');

    groups.forEach(group => {

      /*
       * Symbol aus der Einzelanalyse holen.
       */
      const symbolElement =
        group.querySelector('.summary-main span');

      if (!symbolElement) {
        return;
      }

      const symbol =
        symbolElement.textContent.trim();

      if (!symbol) {
        return;
      }

      const value =
        getTestKgv(symbol);

      if (value !== null) {
        addKgv(group, value);
      }

    });
  }

  function init() {

    /*
     * Einzelanalyse-Container
     */
    const root =
      document.getElementById('individuals');

    if (!root) {
      return;
    }

    /*
     * Nach dem Rendern der Einzelanalyse prüfen.
     */
    setTimeout(scan, 500);

    /*
     * Wenn app.js eine neue Einzelanalyse rendert,
     * erneut prüfen.
     */
    const observer =
      new MutationObserver(function () {
        setTimeout(scan, 200);
      });

    observer.observe(root, {
      childList: true,
      subtree: true
    });

    /*
     * Bei Zeitraumwechsel erneut prüfen.
     */
    document.addEventListener('click', function (event) {

      if (
        event.target.closest('.tab') ||
        event.target.closest('.top10-detail')
      ) {
        setTimeout(scan, 500);
      }

    });

    /*
     * Auch nach kurzer Verzögerung nochmals prüfen,
     * falls die Analyse etwas später rendert.
     */
    setTimeout(scan, 1500);
    setTimeout(scan, 3000);
  }

  /*
   * Start
   */
  if (document.readyState === 'loading') {

    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );

  } else {

    init();

  }

  /*
   * Optional für Tests in der Browser-Konsole.
   */
  window.AKTKGV = {
    scan: scan
  };

})();
