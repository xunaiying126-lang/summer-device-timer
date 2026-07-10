type WorkerEnv = {
  readonly ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
};

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const response = await env.ASSETS.fetch(request);
    if (!response.headers.get("content-type")?.includes("text/html")) {
      return response;
    }

    const origin = new URL(request.url).origin;
    const headers = new Headers(response.headers);
    headers.delete("content-length");

    return new Response((await response.text()).split("__SITE_ORIGIN__").join(origin), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
