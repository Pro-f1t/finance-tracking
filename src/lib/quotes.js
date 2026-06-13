// Live market data from Yahoo Finance's public chart API.
// Yahoo blocks cross-origin browser requests, so calls go through public CORS
// proxies — if one is down we try the next, and results are cached for 5 minutes.

const PROXIES = [
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

const cache = new Map();
const TTL = 5 * 60 * 1000;

export const RANGE_KEYS = ['1M', 'YTD', '1Y', '3Y'];

const RANGES = {
  '1M': { range: '1mo', interval: '1d' },
  YTD: { range: 'ytd', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
  '3Y': { range: '3y', interval: '1wk' },
};

async function fetchYahoo(symbol, range, interval) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  let lastErr;
  for (const wrap of PROXIES) {
    try {
      const res = await fetch(wrap(url));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) throw new Error(json?.chart?.error?.description || `No data for ${symbol}`);
      return result;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`Couldn't fetch ${symbol}: ${lastErr?.message || 'all data sources failed'}`);
}

async function fetchCached(symbol, range, interval, key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const result = await fetchYahoo(symbol, range, interval);
  const ts = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const points = ts
    .map((t, i) => ({ t: t * 1000, close: closes[i] }))
    .filter((p) => p.close != null);
  const data = {
    points,
    meta: {
      price: result.meta?.regularMarketPrice,
      prevClose: result.meta?.chartPreviousClose,
      name: result.meta?.shortName || result.meta?.longName || symbol.toUpperCase(),
      currency: result.meta?.currency,
    },
  };
  cache.set(key, { at: Date.now(), data });
  return data;
}

// Historical close prices for a chart range.
export function fetchSeries(symbol, rangeKey) {
  const { range, interval } = RANGES[rangeKey];
  return fetchCached(symbol, range, interval, `s:${symbol}:${rangeKey}`);
}

// Current price + previous trading day's close (for day change).
export async function fetchQuote(symbol) {
  const data = await fetchCached(symbol, '5d', '1d', `q:${symbol}`);
  const pts = data.points;
  const last = pts[pts.length - 1]?.close;
  const price = Number.isFinite(data.meta.price) ? data.meta.price : last;
  let prevClose = pts.length >= 2 ? pts[pts.length - 2].close : data.meta.prevClose;
  // Without a usable previous close, treat day change as zero rather than NaN.
  if (!Number.isFinite(prevClose)) prevClose = price;
  return { price, prevClose, name: data.meta.name };
}

// Sums several price series (shares-weighted) into one portfolio-value series,
// forward-filling each symbol's last known price across non-overlapping dates.
export function combineSeries(list) {
  const dates = [...new Set(list.flatMap((s) => s.points.map((p) => p.t)))].sort((a, b) => a - b);
  const idx = list.map(() => -1);
  return dates.map((t) => {
    let value = 0;
    list.forEach((s, i) => {
      while (idx[i] + 1 < s.points.length && s.points[idx[i] + 1].t <= t) idx[i]++;
      if (idx[i] >= 0) value += s.points[idx[i]].close * s.shares;
    });
    return { t, value };
  });
}
