import type { Handler } from '@/types.ts'

const handlerMap: Map<string, string | Handler> = new Map([
  ['deno-ver', 'deno-ver/main.ts'],
  ['count', 'count/main.ts'],
])

Deno.serve(async (req, info) => {
  const url = new URL(req.url)
  const key = url.pathname.match(/[^/]+/)?.[0]
  let handler
  if (key && (handler = handlerMap.get(key))) {
    if (typeof handler === 'string') {
      handler = (await import(`./${handler}`)).handler as Handler
      handlerMap.set(key, handler)
    }
    const resp = await handler(req, info)
    if (resp instanceof Response) {
      return resp
    }
  }
  return new Response(null, { status: 404 })
})
