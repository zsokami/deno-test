import type { Handler } from '@/types.ts'

const handlerMap: Map<string, string | Handler> = new Map([
  ['deno-ver', 'deno-ver/main.ts'],
  ['count', 'count/main.ts'],
  ['headers', 'headers/main.ts'],
  ['fetch', 'fetch/main.ts'],
  ['event-stream', 'event-stream/main.ts'],
  ['d', 'd/main.ts'],
])

const { addr } = Deno.serve({
  hostname: Deno.env.get('IP'),
  port: Number(Deno.env.get('PORT')) || undefined,
  onError(e) {
    console.error(e)
    return new Response('500 Internal Server Error', { status: 500 })
  },
}, async (req, { remoteAddr }) => {
  const url = new URL(req.url)
  const key = url.pathname.match(/[^/]+/)?.[0]
  let handler
  if (key && (handler = handlerMap.get(key))) {
    if (typeof handler === 'string') {
      handler = (await import(`./${handler}`)).handler as Handler
      handlerMap.set(key, handler)
    }
    const resp = await handler(req, { remoteAddr, addr })
    if (resp instanceof Response) {
      return resp
    }
  }
  return new Response('404 Not Found', { status: 404 })
})
