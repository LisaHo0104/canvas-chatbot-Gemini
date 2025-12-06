import { tool } from 'ai';
import { z } from 'zod';

function isHttpUrl(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number; retries?: number } = {},
) {
  const { timeoutMs = 10000, retries = 2, ...rest } = init;
  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...rest, signal: controller.signal });
      clearTimeout(t);
      return res;
    } catch (err) {
      clearTimeout(t);
      if (attempt >= retries) throw err;
      attempt += 1;
    }
  }
}

function stripHTML(html: string) {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const text = withoutScripts.replace(/<[^>]+>/g, ' ');
  return text.replace(/\s+/g, ' ').trim();
}

export function createWebTools() {
  const tavilyKey = process.env.TAVILY_API_KEY || '';
  const braveKey = process.env.BRAVE_API_KEY || '';

  return {
    search_web: tool({
      description: 'Search the web and return website results with titles, URLs, and snippets',
      inputSchema: z.object({
        query: z.string(),
        maxResults: z.number().int().min(1).max(10).default(5),
      }),
      execute: async ({ query, maxResults }: { query: string; maxResults: number }) => {
        const results: Array<{ title: string; url: string; snippet: string }> = [];

        if (tavilyKey) {
          const resp = await fetchWithTimeout('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: tavilyKey,
              query,
              search_depth: 'advanced',
              max_results: Math.min(maxResults, 10),
            }),
            timeoutMs: 10000,
            retries: 2,
          });
          if (!resp.ok) {
            throw new Error(`Tavily search failed: ${resp.status}`);
          }
          const data = await resp.json();
          const items = Array.isArray(data?.results) ? data.results : [];
          for (const item of items) {
            const url = String(item?.url || '');
            if (!isHttpUrl(url)) continue;
            results.push({
              title: String(item?.title || ''),
              url,
              snippet: String(item?.content || item?.description || ''),
            });
          }
        } else if (braveKey) {
          const qs = new URLSearchParams({ q: query, count: String(Math.min(maxResults, 10)) });
          const resp = await fetchWithTimeout(`https://api.search.brave.com/res/v1/web/search?${qs.toString()}`, {
            headers: { 'X-Subscription-Token': braveKey },
            timeoutMs: 10000,
            retries: 2,
          });
          if (!resp.ok) {
            throw new Error(`Brave search failed: ${resp.status}`);
          }
          const data = await resp.json();
          const items = Array.isArray(data?.web?.results) ? data.web.results : [];
          for (const item of items) {
            const url = String(item?.url || '');
            if (!isHttpUrl(url)) continue;
            results.push({
              title: String(item?.title || ''),
              url,
              snippet: String(item?.description || ''),
            });
          }
        } else {
          return {
            results: [],
            provider: null,
            note: 'No web search provider configured. Set TAVILY_API_KEY or BRAVE_API_KEY.',
          } as any;
        }

        return { results } as any;
      },
    }),

    fetch_page: tool({
      description: 'Fetch a web page over http(s) and return readable text content',
      inputSchema: z.object({ url: z.string() }),
      execute: async ({ url }: { url: string }) => {
        if (!isHttpUrl(url)) {
          throw new Error('Only http(s) URLs are allowed');
        }
        const resp = await fetchWithTimeout(url, { timeoutMs: 10000, retries: 2 });
        if (!resp.ok) {
          throw new Error(`Fetch failed: ${resp.status}`);
        }
        const html = await resp.text();
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';
        let content = stripHTML(html);
        const maxChars = 20000;
        if (content.length > maxChars) content = content.slice(0, maxChars);
        const wordCount = content ? content.split(/\s+/).length : 0;
        return { url, title, content, wordCount } as any;
      },
    }),
  };
}

