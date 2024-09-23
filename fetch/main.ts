import type { Handler } from '@/types.ts'

const headersToExclude = new Set(['host', 'traceparent', 'cdn-loop'])

export const handler: Handler = (req) => {
  const m = req.url.match(/\/fetch\/+(.*)/)
  if (!m) return undefined
  return fetch(m[1], {
    method: req.method,
    headers: [...req.headers].filter(([k]) => !headersToExclude.has(k)),
    body: req.body,
  })
}
