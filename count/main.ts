import type { Handler } from '@/types.ts'
import { acceptsLanguages } from '@std/http/negotiation'

const count: Map<string, number> = new Map()

export const handler: Handler = async (req, { remoteAddr: { hostname: rHostname, port: rPort }, addr: { hostname, port } }) => {
  if (rHostname.includes(':')) {
    rHostname = `[${rHostname}]`
  }
  if (hostname.includes(':')) {
    hostname = `[${hostname}]`
  }
  const key = `${rHostname}:${rPort}`
  count.set(key, (count.get(key) ?? 0) + 1)

  let html = await (await fetch(new URL('index.html', import.meta.url))).text()
  html = html.replace(/<html lang="zh"|(<(\w+) id="(\w+)"[^>]*>)(<\/\2>)/g, (...m) => {
    if (m[0] === '<html lang="zh"') {
      const lang = acceptsLanguages(req, 'zh', 'en') ?? 'en'
      return lang === 'zh' ? m[0] : '<html lang="en"'
    }
    if (m[3] === 'output') {
      return m[1] + `<div>${hostname}:${port}</div><div>(server)</div>` + [...count].map(([k, v]) => `<div>${k}</div><div>${v}</div>`).join('') + m[4]
    }
    return m[0]
  })

  return new Response(html, { headers: { 'content-type': 'text/html' } })
}
