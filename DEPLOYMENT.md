# Frontend Deployment (Cloudflare R2 + Worker)

This app is built with Vite and deployed as static assets to a Cloudflare R2 bucket, served via a Cloudflare Worker.

## Overview
- Build artifacts live in `dist/`.
- A Cloudflare R2 bucket stores the static files.
- A Cloudflare Worker (configured in `wrangler.toml` and `worker/worker.js`) serves the SPA with proper caching and fallback to `index.html`.
- CI/CD via GitHub Actions builds the app, syncs `dist/` to R2, and publishes the Worker on pushes to `main`.

## Prerequisites
- Cloudflare account and an API token with permissions:
  - Workers Scripts: Edit
  - Workers KV Storage: Read (not used, but commonly included)
  - R2 Storage: Edit
- An R2 bucket created, e.g., `bookeasy-frontend`. Update the name in `frontend/wrangler.toml` if different.
- DNS route to your Worker (optional but recommended), configured in the Cloudflare dashboard after first publish.

## Configuration Files
- `wrangler.toml` binds the R2 bucket as `STATIC_BUCKET` and points to the Worker entry `worker/worker.js`.
- `worker/worker.js` implements:
  - Key lookup in R2 for requests (e.g., `/assets/...`)
  - SPA fallback to `index.html`
  - Cache headers for hashed assets vs HTML

## GitHub Secrets
Create these repository secrets (Settings → Secrets and variables → Actions):

- `CF_API_TOKEN`: Cloudflare API token
- `CF_ACCOUNT_ID`: Cloudflare Account ID
- `R2_ACCESS_KEY_ID`: R2 access key (S3-compatible)
- `R2_SECRET_ACCESS_KEY`: R2 secret key (S3-compatible)
- `R2_ACCOUNT_ID`: Same as Cloudflare Account ID (used in endpoint URL)
- `R2_BUCKET`: Name of your R2 bucket (e.g., `bookeasy-frontend`)

## CI/CD
The workflow at `.github/workflows/frontend-cloudflare-r2-deploy.yml` will:
1. Build the app
2. Sync `dist/` to the R2 bucket (`aws s3 sync` with the R2 endpoint)
3. Publish the Worker (`cloudflare/wrangler-action`)

Trigger: Pushes to `main` affecting files under `frontend/**`, or manual via “Run workflow”.

## Local Preview (optional)
You can run locally without the Worker using Vite:
- `npm run dev` for development
- `npm run build` and `npm run preview` to preview the production build locally

To test the Worker locally against R2, use Wrangler:
- Install: `npm i -g wrangler`
- Ensure an R2 bucket exists and is listed/bound in `wrangler.toml`
- Run: `wrangler dev` from `frontend/` (requires Cloudflare login)

## Notes
- For SPA routing, any unknown path falls back to `index.html`.
- Hashed assets (e.g., `index-<hash>.js`) are served with long-term immutable caching.
- Update `wrangler.toml` `name`, `bucket_name`, and other fields to match your environment.
- If you prefer Cloudflare Pages instead of R2 + Worker, you can deploy the `dist/` output directly with `cloudflare/pages-action`.
