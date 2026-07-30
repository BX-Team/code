type Env = {
  ASSETS: { fetch(request: Request | URL): Promise<Response> };
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;

    const isFileRequest = /\.[a-z0-9]+$/i.test(url.pathname);
    if (isFileRequest) return asset;

    return env.ASSETS.fetch(new URL('/200.html', url));
  },
};
