type Env = {
  ASSETS: { fetch(request: Request | URL): Promise<Response> };
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (/\.[a-z0-9]+$/i.test(url.pathname)) return env.ASSETS.fetch(request);

    return env.ASSETS.fetch(new URL('/200.html', url));
  },
};
