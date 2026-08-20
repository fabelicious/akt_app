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

    // Same-origin market-data proxy for TEST. This removes the dependency on
    // public CORS proxies (which intermittently fail or rate-limit requests).
    if (url.pathname === "/__proxy") {
      const target = url.searchParams.get("url");
      if (!target) return new Response("missing url", { status: 400 });
      let targetUrl;
      try {
        targetUrl = new URL(target);
      } catch (_) {
        return new Response("invalid url", { status: 400 });
      }
      if (targetUrl.hostname !== "query1.finance.yahoo.com") {
        return new Response("proxy target not allowed", { status: 403 });
      }
      try {
        const upstream = await fetch(targetUrl.toString(), {
          headers: { "User-Agent": "AKT-Pro/TEST" },
          cf: { cacheTtl: 60, cacheEverything: true }
        });
        const headers = new Headers(upstream.headers);
        headers.set("access-control-allow-origin", "*");
        headers.set("cache-control", "public, max-age=60");
        headers.set("X-AKT-TEST", "xetra-v7");
        return new Response(upstream.body, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Yahoo proxy failed", detail: String(err) }), {
          status: 502,
          headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" }
        });
      }
    }

    // Serve an app.js variant that routes Yahoo requests through this Worker.
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
