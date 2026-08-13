(function () {
  'use strict';

  const cache = new Map();
  const pending = new Map();
  const CACHE_TTL = 6 * 60 * 60 * 1000;

  async function fetchJson(url, timeout = 3500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function requestQuote(symbol) {
    const yahooUrl = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + encodeURIComponent(symbol);
    const urls = [
      'https://corsproxy.io/?url=' + encodeURIComponent(yahooUrl),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(yahooUrl)
    ];
    for (const url of urls) {
      try {
        const json = await fetchJson(url);
        const quote = json?.quoteResponse?.result?.[0];
        if (quote) return quote;
      } catch (_) {}
    }
    return null;
  }

  async function getKgv(symbol) {
    const key = String(symbol || '').trim().toUpperCase();
    if (!key) return null;

    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.value;
    if (pending.has(key)) return pending.get(key);

    const promise = (async () => {
      try {
        const quote = await requestQuote(key);
        if (!quote) return null;

        const trailing = Number(quote.trailingPE);
        const forward = Number(quote.forwardPE);
        let value = null;

        if (Number.isFinite(trailing) && trailing > 0 && trailing < 10000) {
          value = trailing;
        } else if (Number.isFinite(forward) && forward > 0 && forward < 10000) {
          value = forward;
        }

        cache.set(key, { timestamp: Date.now(), value });
        return value;
      } catch (_) {
        return null;
      } finally {
        pending.delete(key);
      }
    })();

    pending.set(key, promise);
    return promise;
  }

  function formatKgv(value) {
    return Number(value).toLocaleString('de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function findScoreTarget(group) {
    return group.querySelector('.card.wide .score') || group.querySelector('.score');
  }

  async function updateGroup(group) {
    try {
      if (!group || !document.body.contains(group)) return;

      const symbol = group.querySelector('.summary-main span')?.textContent?.trim();
      const target = findScoreTarget(group);
      if (!symbol || !target) return;

      const value = await getKgv(symbol);
      if (value === null || !Number.isFinite(Number(value)) || Number(value) <= 0) return;
      if (!document.body.contains(group)) return;

      const currentTarget = findScoreTarget(group);
      if (!currentTarget) return;

      let box = currentTarget.querySelector('.kgv-value');
      if (!box) {
        box = document.createElement('span');
        box.className = 'kgv-value';
        box.style.marginLeft = '10px';
        box.style.fontSize = '14px';
        box.style.fontWeight = '800';
        box.style.whiteSpace = 'nowrap';
        currentTarget.appendChild(box);
      }
      box.textContent = ' · KGV: ' + formatKgv(value);
    } catch (_) {}
  }

  function scan() {
    document.querySelectorAll('.stock-group').forEach(group => {
      updateGroup(group).catch(() => {});
    });
  }

  function scheduleScan(delay = 250) {
    setTimeout(scan, delay);
  }

  function init() {
    const root = document.getElementById('individuals');
    if (!root) return;

    const observer = new MutationObserver(mutations => {
      const addedAnalysis = mutations.some(mutation =>
        Array.from(mutation.addedNodes || []).some(node =>
          node.nodeType === 1 && (
            node.classList?.contains('stock-group') ||
            node.querySelector?.('.stock-group')
          )
        )
      );
      if (addedAnalysis) scheduleScan(150);
    });

    observer.observe(root, { childList: true });
    scheduleScan(350);

    document.addEventListener('click', event => {
      if (event.target.closest('.tab, .top10-detail')) scheduleScan(500);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.AKTKGV = { get: getKgv, scan };
})();
