import type { Handler } from '@/types.ts'

export const handler: Handler = (req) => {
  const m = req.url.match(/\/fetch\/+(.*)/)
  if (!m) return undefined
  const reqProps: Record<string, any> = {}
  for (const k in req) {
    reqProps[k] = (req as any)[k]
  }
  return Response.json({
    url: m[1],
    req: reqProps
  })
}
