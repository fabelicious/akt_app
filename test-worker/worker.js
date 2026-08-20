export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Keep the isolated TEST runtime unmistakable without changing application assets.
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
