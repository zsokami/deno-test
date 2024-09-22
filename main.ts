const handlerMap = new Map([
  ['deno-ver', './deno-ver/main.ts'],
  ['count', './count/main.ts'],
])

Deno.serve(async (req, info) => {
  const url = new URL(req.url)
  const m = url.pathname.match(/[^/]+/)
  if (m) {
    const handlerPath = handlerMap.get(m[0])
    if (typeof handlerPath === 'string') {
      const { handler } = await import(handlerPath)
      if (typeof handler === 'function') {
        const resp = await handler(req, info)
        if (resp instanceof Response) {
          return resp
        }
      }
    }
  }
  return new Response(null, { status: 404 })
})
