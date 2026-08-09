# 4. Deploy as a static-asset Worker

- **Status:** Accepted
- **Date:** 2026-08-09

## Context

The brief required a stack deployable to Cloudflare Workers, and equally
required that there be no server-side API, no accounts and no stored data. The
game is entirely client-side: the AI runs in the browser and the score lives in
memory.

Cloudflare offers several shapes for this. A Worker script could serve the
bundle from code. Cloudflare Pages is the traditional static host. Workers also
support a static-assets binding, where assets are served directly from the edge
without invoking a Worker at all.

## Decision

Ship as a Workers project whose only content is a static-assets binding, via
`wrangler.toml`:

```toml
[assets]
directory = "./dist"
not_found_handling = "single-page-application"
```

There is no Worker script. Deployment is `npm run build && wrangler deploy`.

## Consequences

- No Worker invocation per request, so no cold start, no CPU time billed, and
  nothing to keep warm. Requests are served from cache at the edge.
- The deployment target is exactly what the brief asked for, and `wrangler dev`
  reproduces edge behaviour locally.
- `not_found_handling` is set to single-page-application so any path returns the
  app rather than a 404. The game has no routes today; this costs nothing and
  removes a sharp edge if one is ever added.
- Adding real server behaviour later means introducing a Worker script, which is
  an additive change to this configuration rather than a migration.
- The project stays deployable to any static host, since nothing outside
  `wrangler.toml` is Cloudflare-specific. That is deliberate — it keeps the
  hosting decision cheap to reverse.
