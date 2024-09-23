import type { Handler } from '@/types.ts'

export const handler: Handler = (req) => {
  const m = req.url.match(/\/fetch\/+(.*)/)
  if (!m) return undefined
  return Response.json({
    url: m[1],
    req
  })
}
