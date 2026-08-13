(function () {
  'use strict';

  /* Optional KGV display only. Never part of price data or scoring. */
  const cache = new Map();
  const pending = new Map();
  const CACHE_TTL = 6 * 60 * 60 * 1000;

  async function fetchJson(url, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout || 3000);
    try {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function getKgv(symbol) {
    const key = String(symbol || '').trim().toUpperCase();
    if (!key) return null;

    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.value;

    if (pending.has(key)) return pending.get(key);

    const request = (async () => {
      let value = null;
      const yahooUrl = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + encodeURIComponent(key);
      let quote = null;

      try {
        try {
          const result = await fetchJson('https://corsproxy.io/?url=' + encodeURIComponent(yahooUrl), 3000);
          quote = result?.quoteResponse?.result?.[0] || null;
        } catch (_) {
          const result = await fetchJson('https://api.allorigins.win/raw?url=' + encodeURIComponent(yahooUrl), 3000);
          quote = result?.quoteResponse?.result?.[0] || null;
        }

        if (quote) {
          const trailing = Number(quote.trailingPE);
          const forward = Number(quote.forwardPE);
          if (Number.isFinite(trailing) && trailing > 0 && trailing < 10000) value = trailing;
          else if (Number.isFinite(forward) && forward > 0 && forward < 10000) value = forward;
        }
      } catch (_) {
        value = null;
      }

      cache.set(key, { timestamp: Date.now(), value });
      pending.delete(key);
      return value;
    })();

    pending.set(key, request);
    return request;
  }

  function formatKgv(value) {
    return Number(value).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  async function updateGroup(group) {
    try {
      if (!group || !document.body.contains(group)) return;

      const symbolElement = group.querySelector('.summary-main span');
      const target = group.querySelector('.card.wide .score');
      if (!symbolElement || !target) return;

      const symbol = symbolElement.textContent.trim();
      if (!symbol) return;

      const value = await getKgv(symbol);
      if (value === null || !Number.isFinite(Number(value)) || Number(value) <= 0) return;
      if (!document.body.contains(group)) return;

      const currentTarget = group.querySelector('.card.wide .score');
      if (!currentTarget) return;

      const existing = currentTarget.querySelector('.kgv-value');
      if (existing) existing.remove();

      const box = document.createElement('span');
      box.className = 'kgv-value';
      box.textContent = ' · KGV: ' + formatKgv(value);
      box.style.marginLeft = '10px';
      box.style.fontSize = '14px';
      box.style.fontWeight = '800';
      box.style.whiteSpace = 'nowrap';
      currentTarget.appendChild(box);
    } catch (_) {}
  }

  function scan() {
    try {
      document.querySelectorAll('.stock-group').forEach(group => {
        updateGroup(group).catch(() => {});
      });
    } catch (_) {}
  }

  function scheduleScan(delay) {
    setTimeout(scan, delay || 200);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('individuals');
    if (!root) return;

    /* Observe only direct analysis cards. Changes to .kgv-value are ignored. */
    const observer = new MutationObserver(mutations => {
      const relevant = mutations.some(mutation => {
        if (mutation.type !== 'childList') return false;
        return Array.from(mutation.addedNodes).some(node => {
          return node.nodeType === 1 && (
            node.classList?.contains('stock-group') ||
            node.querySelector?.('.stock-group')
          );
        });
      });
      if (relevant) scheduleScan(120);
    });

    observer.observe(root, { childList: true });
    scheduleScan(400);

    document.addEventListener('click', event => {
      if (event.target.closest('.tab, .top10-detail')) scheduleScan(500);
    });
  }, { once: true });

  window.AKTKGV = { get: getKgv, scan };
})();
