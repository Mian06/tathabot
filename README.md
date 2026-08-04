# Tathabot – Perplexity Sonar Research Assistant (Arabic / English)

A simple, 1‑screen web app with Arabic RTL / English toggle, powered by the **Perplexity Sonar** model. The frontend is a React app, and the backend is a **Cloudflare Pages Function** that securely proxies requests to the Perplexity API.

## Live Demo

After deployment, your site will be available at:  
`https://<your-project>.pages.dev`

## Architecture

- **Frontend:** React + Vite, single input search, streaming display of results.
- **Backend:** Cloudflare Pages function (`functions/api/proxy.js`) that forwards requests to the Perplexity API and streams the response back to the browser.  
- **Security:** The Perplexity API key is stored as a **Cloudflare environment variable** (`PERPLEXITY_API_KEY`) and never exposed to the client.

## API Parameters Used

The proxy sends the following parameters to `https://api.perplexity.ai/chat/completions`:

| Parameter             | Value / Description                                                                       |
|-----------------------|-------------------------------------------------------------------------------------------|
| `model`               | `"sonar"`                                                                                 |
| `messages`            | Array with a system message (role + citation rules) and the user query.                   |
| `temperature`         | `0` – deterministic output, best for factual accuracy.                                    |
| `search_recency_filter` | `"month"` – restricts web sources to the last month. **Cannot be combined with exact date filters.** |
| `search_domain_filter` | Whitelist of trusted domains (max 20 domains). Default list: `wikipedia.org`, `arxiv.org`, `github.com`, `stackoverflow.com`, `developer.mozilla.org` |
| `stream`              | `true` – enables Server‑Sent Events for real‑time response streaming.                     |

**Important limitations (also noted in the Perplexity API docs):**
- `search_domain_filter` accepts **a maximum of 20 domains**.
- `search_recency_filter` **cannot be used together with exact date filters**. If you need a custom date range, omit `search_recency_filter` and use separate date parameters (not implemented in this demo).

## How to Deploy

1. Fork or clone this repository to your GitHub account.
2. In Cloudflare Dashboard → Workers & Pages → Pages → **Connect to Git**.
3. Select your repository and set:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variable:** `PERPLEXITY_API_KEY` = *your Sonar API key*
4. Deploy. The live URL will be shown after the first build.

## Local Development

```bash
npm install
npm run dev