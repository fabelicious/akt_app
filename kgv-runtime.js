(function () {
  'use strict';

  /*
   * AKT-Pro – unabhängige KGV-Funktion
   *
   * KGV beeinflusst NICHT:
   * - Kursdaten
   * - AKTScore
   * - Charts
   * - WKN-Auflösung
   * - Handelsplatz
   * - Top 10
   *
   * Anzeige:
   * - KGV vorhanden  -> KGV: 27
   * - KGV nicht vorhanden -> KGV: n/A
   */

  const CACHE_TTL = 6 * 60 * 60 * 1000;
  const cache = new Map();
  const pending = new Map();

  function fetchJson(url, timeout = 3500) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      timeout
    );

    return fetch(url, {
      cache: 'no-store',
      signal: controller.signal
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }

        return response.json();
      })
      .finally(() => {
        clearTimeout(timer);
      });
  }

  function validKgv(value) {
    const number = Number(value);

    if (
      Number.isFinite(number) &&
      number > 0 &&
      number < 10000
    ) {
      return number;
    }

    return null;
  }

  /*
   * Yahoo KGV
   */
  async function getYahooKgv(symbol) {

    const quoteUrl =
      'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' +
      encodeURIComponent(symbol);

    const summaryUrl =
      'https://query2.finance.yahoo.com/v10/finance/quoteSummary/' +
      encodeURIComponent(symbol) +
      '?modules=summaryDetail,defaultKeyStatistics,financialData';

    const proxies = [
      function (url) {
        return (
          'https://corsproxy.io/?url=' +
          encodeURIComponent(url)
        );
      },

      function (url) {
        return (
          'https://api.allorigins.win/raw?url=' +
          encodeURIComponent(url)
        );
      }
    ];

    /*
     * 1. Yahoo Quote API
     */
    for (const proxy of proxies) {

      try {

        const result =
          await fetchJson(
            proxy(quoteUrl),
            3000
          );

        const quote =
          result?.quoteResponse?.result?.[0];

        if (quote) {

          const trailing =
            validKgv(quote.trailingPE);

          if (trailing !== null) {
            return trailing;
          }

          const forward =
            validKgv(quote.forwardPE);

          if (forward !== null) {
            return forward;
          }
        }

      } catch (_) {
        /*
         * nächsten Datenweg versuchen
         */
      }
    }

    /*
     * 2. Yahoo QuoteSummary API
     */
    for (const proxy of proxies) {

      try {

        const result =
          await fetchJson(
            proxy(summaryUrl),
            3000
          );

        const data =
          result?.quoteSummary?.result?.[0];

        if (!data) {
          continue;
        }

        const values = [

          data?.summaryDetail?.trailingPE?.raw,

          data?.defaultKeyStatistics?.trailingPE?.raw,

          data?.defaultKeyStatistics?.forwardPE?.raw,

          data?.financialData?.forwardPE?.raw

        ];

        for (const value of values) {

          const kgv =
            validKgv(value);

          if (kgv !== null) {
            return kgv;
          }
        }

      } catch (_) {
        /*
         * nächsten Datenweg versuchen
         */
      }
    }

    return null;
  }

  /*
   * KGV laden
   *
   * Parallel laufende Abfragen für dasselbe
   * Symbol werden zusammengeführt.
   */
  async function getKgv(symbol) {

    const key =
      String(symbol || '')
        .trim()
        .toUpperCase();

    if (!key) {
      return null;
    }

    /*
     * Cache
     */
    const cached =
      cache.get(key);

    if (
      cached &&
      Date.now() - cached.timestamp < CACHE_TTL
    ) {
      return cached.value;
    }

    /*
     * Bereits laufende Abfrage verwenden
     */
    if (pending.has(key)) {
      return pending.get(key);
    }

    const request =
      getYahooKgv(key)
        .catch(() => null)
        .then(value => {

          cache.set(key, {
            timestamp: Date.now(),
            value: value
          });

          return value;

        })
        .finally(() => {
          pending.delete(key);
        });

    pending.set(key, request);

    return request;
  }

  function formatKgv(value) {

    return Number(value).toLocaleString(
      'de-DE',
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    );
  }

  /*
   * KGV in die vorhandene Empfehlungskachel schreiben
   */
  function updateKgvDisplay(group, value) {

    if (!group) {
      return;
    }

    const target =
      group.querySelector(
        '.card.wide .score'
      ) ||
      group.querySelector('.score');

    if (!target) {
      return;
    }

    let element =
      group.querySelector(
        '.kgv-value'
      );

    if (!element) {

      element =
        document.createElement('span');

      element.className =
        'kgv-value';

      element.style.cssText =
        [
          'display:inline-block',
          'margin-left:12px',
          'font-size:14px',
          'font-weight:800',
          'white-space:nowrap'
        ].join(';');

      /*
       * Neben der technischen Empfehlung
       */
      target.appendChild(element);
    }

    if (
      value !== null &&
      Number.isFinite(Number(value))
    ) {

      element.textContent =
        'KGV: ' +
        formatKgv(value);

    } else {

      element.textContent =
        'KGV: n/A';
    }
  }

  /*
   * Einzelanalysen durchsuchen
   */
  function scan() {

    try {

      document
        .querySelectorAll('.stock-group')
        .forEach(group => {

          const symbolElement =
            group.querySelector(
              '.summary-main span'
            );

          if (!symbolElement) {
            return;
          }

          const symbol =
            symbolElement.textContent.trim();

          if (!symbol) {
            return;
          }

          /*
           * Sofort n/A anzeigen.
           *
           * Sobald ein echtes KGV gefunden wird,
           * wird n/A ersetzt.
           */
          updateKgvDisplay(
            group,
            null
          );

          /*
           * KGV vollständig unabhängig laden.
           */
          getKgv(symbol)
            .then(value => {

              /*
               * Analyse existiert noch?
               */
              if (
                !document.body.contains(group)
              ) {
                return;
              }

              updateKgvDisplay(
                group,
                value
              );

            })
            .catch(() => {

              if (
                document.body.contains(group)
              ) {

                updateKgvDisplay(
                  group,
                  null
                );
              }

            });

        });

    } catch (_) {
      /*
       * KGV darf niemals die Hauptanalyse stören.
       */
    }
  }

  /*
   * Initialisierung
   */
  function init() {

    const root =
      document.getElementById(
        'individuals'
      );

    if (!root) {
      return;
    }

    let timer = null;

    function scheduleScan(delay) {

      clearTimeout(timer);

      timer =
        setTimeout(
          scan,
          delay || 250
        );
    }

    /*
     * Neue Einzelanalysen erkennen
     */
    const observer =
      new MutationObserver(
        mutations => {

          const changed =
            mutations.some(
              mutation =>
                mutation.addedNodes &&
                mutation.addedNodes.length
            );

          if (changed) {
            scheduleScan(150);
          }

        }
      );

    observer.observe(
      root,
      {
        childList: true,
        subtree: true
      }
    );

    /*
     * Initial
     */
    scheduleScan(400);

    /*
     * Zeitraumwechsel / Top-10-Detailanalyse
     */
    document.addEventListener(
      'click',
      event => {

        if (
          event.target.closest(
            '.tab, .top10-detail'
          )
        ) {

          scheduleScan(500);
        }

      }
    );
  }

  /*
   * Start
   */
  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );

  } else {

    init();

  }

  /*
   * Optional für andere Scripts / Debugging
   */
  window.AKTKGV = {
    get: getKgv,
    scan: scan
  };

})();
