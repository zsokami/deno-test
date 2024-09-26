import type { Handler } from '@/types.ts'

const handlerMap: Map<string, string | Handler> = new Map([
  ['deno-ver', 'deno-ver/main.ts'],
  ['count', 'count/main.ts'],
  ['accepts', 'accepts/main.ts'],
  ['fetch', 'fetch/main.ts'],
])

const { addr } = Deno.serve({
  hostname: Deno.env.get('IP'),
  port: Number(Deno.env.get('PORT')) || undefined,
}, async (req, info) => {
  const url = new URL(req.url)
  const key = url.pathname.match(/[^/]+/)?.[0]
  let handler
  if (key && (handler = handlerMap.get(key))) {
    if (typeof handler === 'string') {
      handler = (await import(`./${handler}`)).handler as Handler
      handlerMap.set(key, handler)
    }
    console.log(addr)
    const resp = await handler(req, { remoteAddr: info.remoteAddr, completed: info.completed, addr })
    if (resp instanceof Response) {
      return resp
    }
  }
  return new Response(null, { status: 404 })
})
