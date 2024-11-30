import type { Handler } from '@/types.ts'
import tls from 'tls'

export const handler: Handler = async (req) => {
  const m = req.url.match(/\/cert\/+(.+)/)
  if (!m) return undefined
  try {
    const cert = await new Promise((resolve, reject) => {
      const socket = tls.connect(443, m[1], { servername: m[1] })
      socket.on('secureConnect', () => {
        const { subject, subjectaltname, issuer, valid_from, valid_to } = socket.getPeerCertificate()
        resolve({ subject, subjectaltname, issuer, valid_from, valid_to })
        socket.end()
      })
      socket.on('error', reject)
    })
    return Response.json(cert)
  } catch {
    return new Response('500 Error', { status: 500 })
  }
}
