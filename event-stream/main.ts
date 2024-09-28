import type { Handler } from '@/types.ts'

const textEncoder = new TextEncoder()
let count = 0

export const handler: Handler = (_, { remoteAddr: { hostname: rHostname, port: rPort } }) => {
  const tag = `event-stream#${++count}`
  const client = `${rHostname.includes(':') ? `[${rHostname}]` : rHostname}:${rPort}`
  let intervalID: number | undefined
  return new Response(
    new ReadableStream({
      start(controller) {
        console.log(`${tag} started. client: ${client}`)
        intervalID = setInterval(() => {
          controller.enqueue(textEncoder.encode(`data: ${JSON.stringify({ t: new Date() })}\n\n`))
        }, 1000)
      },
      cancel() {
        clearInterval(intervalID)
        console.log(`${tag} stopped.`)
      },
    }),
    { headers: { 'content-type': 'text/event-stream' } },
  )
}
