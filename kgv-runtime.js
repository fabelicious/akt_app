(function () {
  'use strict';

  /*
   * AKT-Pro – unabhängige KGV-Funktion
   *
   * Wichtig:
   * - Beeinflusst NICHT Kursdaten
   * - Beeinflusst NICHT das Scoring
   * - Beeinflusst NICHT Charts
   * - Beeinflusst NICHT WKN-Auflösung
   * - KGV ist rein optional
   * - Bei Fehler oder fehlendem KGV wird nichts angezeigt
   */

  const cache = new Map();
  const CACHE_TTL = 6 * 60 * 60 * 1000;

  function safeFetchJson(url, timeout = 3000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

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
      .finally(() => clearTimeout(timer));
  }

  async function getKgv(symbol) {
    const key = String(symbol || '').trim().toUpperCase();

    if (!key) {
      return null;
    }

    const cached = cache.get(key);

    if (
      cached &&
      Date.now() - cached.timestamp < CACHE_TTL
    ) {
      return cached.value;
    }

    const yahooUrl =
      'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' +
      encodeURIComponent(key);

    let quote = null;

    /*
     * KGV-Abfrage ist vollständig optional.
     * Jeder Fehler wird abgefangen.
     */
    try {
      try {
        const result = await safeFetchJson(
          'https://corsproxy.io/?url=' +
            encodeURIComponent(yahooUrl),
          3000
        );

        quote = result?.quoteResponse?.result?.[0] || null;
      } catch (_) {
        try {
          const result = await safeFetchJson(
            'https://api.allorigins.win/raw?url=' +
              encodeURIComponent(yahooUrl),
            3000
          );

          quote = result?.quoteResponse?.result?.[0] || null;
        } catch (_) {
          quote = null;
        }
      }
    } catch (_) {
      quote = null;
    }

    let value = null;

    if (quote) {
      const trailing = Number(quote.trailingPE);
      const forward = Number(quote.forwardPE);

      if (
        Number.isFinite(trailing) &&
        trailing > 0 &&
        trailing < 10000
      ) {
        value = trailing;
      } else if (
        Number.isFinite(forward) &&
        forward > 0 &&
        forward < 10000
      ) {
        value = forward;
      }
    }

    cache.set(key, {
      timestamp: Date.now(),
      value
    });

    return value;
  }

  function formatKgv(value) {
    return Number(value).toLocaleString('de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function updateGroup(group) {
    try {
      const symbolElement =
        group.querySelector('.summary-main span');

      const target =
        group.querySelector('.card.wide .score');

      if (!symbolElement || !target) {
        return;
      }

      const symbol =
        symbolElement.textContent.trim();

      if (!symbol) {
        return;
      }

      /*
       * Vorhandene KGV-Anzeige entfernen.
       * Dadurch entstehen bei erneutem Rendern keine Duplikate.
       */
      const old =
        target.querySelector('.kgv-value');

      if (old) {
        old.remove();
      }

      /*
       * KGV komplett unabhängig und asynchron laden.
       * Die bestehende Analyse läuft davon unabhängig weiter.
       */
      getKgv(symbol)
        .then(value => {
          if (
            !value ||
            !Number.isFinite(Number(value))
          ) {
            return;
          }

          /*
           * Prüfen, ob die Kachel noch im DOM vorhanden ist.
           * Dadurch wird nach einem neuen Rendern nichts
           * in eine alte Analyse geschrieben.
           */
          if (!document.body.contains(group)) {
            return;
          }

          const currentTarget =
            group.querySelector('.card.wide .score');

          if (!currentTarget) {
            return;
          }

          /*
           * Keine doppelte Anzeige erzeugen.
           */
          const existing =
            currentTarget.querySelector('.kgv-value');

          if (existing) {
            existing.remove();
          }

          const box =
            document.createElement('span');

          box.className = 'kgv-value';

          box.style.marginLeft = '10px';
          box.style.fontSize = '14px';
          box.style.fontWeight = '800';
          box.style.whiteSpace = 'nowrap';

          box.textContent =
            ' · KGV: ' + formatKgv(value);

          currentTarget.appendChild(box);
        })
        .catch(() => {
          /*
           * Absichtlich leer:
           * Ein KGV-Fehler darf niemals die Analyse beeinflussen.
           */
        });

    } catch (_) {
      /*
       * Absolute Fehlerisolierung.
       */
    }
  }

  function scan() {
    try {
      document
        .querySelectorAll('.stock-group')
        .forEach(updateGroup);
    } catch (_) {
      /* niemals nach außen werfen */
    }
  }

  function scheduleScan(delay = 150) {
    setTimeout(() => {
      try {
        scan();
      } catch (_) {}
    }, delay);
  }

  document.addEventListener(
    'DOMContentLoaded',
    function () {
      const root =
        document.getElementById('individuals');

      if (!root) {
        return;
      }

      /*
       * Neue Einzelanalysen erkennen.
       * Der Observer verändert die bestehende Analyse nicht.
       */
      const observer =
        new MutationObserver(() => {
          scheduleScan(100);
        });

      observer.observe(root, {
        childList: true,
        subtree: true
      });

      /*
       * Initialer Scan.
       */
      scheduleScan(300);

      /*
       * Bei Zeitraumwechsel oder Top-10-Detailanalyse
       * nach dem bestehenden Rendern erneut prüfen.
       */
      document.addEventListener('click', event => {
        if (
          event.target.closest(
            '.tab, .top10-detail'
          )
        ) {
          scheduleScan(500);
        }
      });
    },
    { once: true }
  );

  /*
   * Optional auch für andere Dateien verfügbar,
   * ohne bestehende Logik zu überschreiben.
   */
  window.AKTKGV = {
    get: getKgv,
    scan: scan
  };

})();
