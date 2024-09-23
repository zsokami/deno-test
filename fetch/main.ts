import type { Handler } from '@/types.ts'

export const handler: Handler = (req) => {
  const m = req.url.match(/\/fetch\/+(.*)/)
  if (!m) return undefined
  req.headers.delete('host')
  req.headers.delete('traceparent')
  req.headers.delete('cdn-loop')
  return fetch(m[1], req)
}
