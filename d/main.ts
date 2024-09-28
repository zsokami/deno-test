import type { Handler } from '@/types.ts'

export const handler: Handler = (req) => {
  const m = new URLPattern({ pathname: '/d/:n(\\d+):unit([km])?' }).exec(req.url)?.pathname.groups
  if (!m) return undefined
  let n = Number(m.n) * (!m.unit ? 1 : m.unit === 'k' ? 1024 : 1048576)
  if (!(n <= 20971520)) return undefined
  const bufsize = 65536
  const buf = new Uint8Array(bufsize).fill(97)
  return new Response(
    new ReadableStream({
      pull(controller) {
        if (controller.desiredSize === null) return
        do {
          if ((n -= bufsize) >= 0) {
            controller.enqueue(buf)
          } else {
            controller.enqueue(buf.subarray(0, n))
            controller.close()
            return
          }
        } while (controller.desiredSize > 0)
      },
    }),
    {
      headers: {
        'content-type': 'application/octet-stream',
        'content-length': `${n}`,
      },
    },
  )
}
