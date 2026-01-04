type AssetsBinding = {
  fetch: (request: Request) => Promise<Response>;
};

export default {
  async fetch(request: Request, env: { ASSETS: AssetsBinding }) {
    return env.ASSETS.fetch(request);
  },
};
