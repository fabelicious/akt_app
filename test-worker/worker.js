export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/__test_status") {
      return new Response(JSON.stringify({
        environment: "TEST",
        runtime: "xetra-v7",
        status: "ok"
      }), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "X-AKT-TEST": "xetra-v7"
        }
      });
    }

    if (url.pathname === "/__proxy") {
      const target = url.searchParams.get("url");
      if (!target) return new Response(JSON.stringify({ error: "missing url" }), { status: 400 });

      let targetUrl;
      try {
        targetUrl = new URL(target);
      } catch (_) {
        return new Response(JSON.stringify({ error: "invalid url" }), { status: 400 });
      }

      if (!["query1.finance.yahoo.com", "query2.finance.yahoo.com"].includes(targetUrl.hostname)) {
        return new Response(JSON.stringify({ error: "proxy target not allowed" }), { status: 403 });
      }

      const candidates = [targetUrl.toString()];
      if (targetUrl.hostname === "query1.finance.yahoo.com") {
        const fallback = new URL(targetUrl.toString());
        fallback.hostname = "query2.finance.yahoo.com";
        candidates.push(fallback.toString());
      }

      let lastStatus = 502;
      let lastBody = null;
      for (const candidate of candidates) {
        try {
          const upstream = await fetch(candidate, {
            headers: {
              "User-Agent": "Mozilla/5.0 AKT-Pro/TEST",
              "Accept": "application/json,text/plain,*/*"
            },
            cf: { cacheTtl: 60, cacheEverything: true }
          });
          lastStatus = upstream.status;
          if (upstream.ok) {
            const headers = new Headers(upstream.headers);
            headers.set("content-type", "application/json; charset=utf-8");
            headers.set("access-control-allow-origin", "*");
            headers.set("cache-control", "public, max-age=60");
            headers.set("X-AKT-TEST", "xetra-v7");
            return new Response(upstream.body, {
              status: 200,
              headers
            });
          }
          lastBody = await upstream.text();
        } catch (err) {
          lastBody = String(err);
        }
      }

      return new Response(JSON.stringify({
        error: "Yahoo proxy failed",
        upstreamStatus: lastStatus,
        detail: lastBody ? String(lastBody).slice(0, 500) : "no upstream response"
      }), {
        status: 502,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "access-control-allow-origin": "*",
          "X-AKT-TEST": "xetra-v7"
        }
      });
    }

    if (url.pathname === "/app.js") {
      const response = await env.ASSETS.fetch(request);
      const source = await response.text();
      const patched = source
        .replaceAll("https://corsproxy.io/?url=", "/__proxy?url=")
        .replaceAll("https://api.allorigins.win/raw?url=", "/__proxy?url=");
      const headers = new Headers(response.headers);
      headers.set("content-type", "application/javascript; charset=utf-8");
      headers.set("cache-control", "no-store");
      headers.set("X-AKT-TEST", "xetra-v7");
      return new Response(patched, { status: response.status, headers });
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("X-AKT-TEST", "xetra-v7");
    headers.set("X-AKT-ENV", "TEST");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
