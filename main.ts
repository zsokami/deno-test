import type { Handler } from '@/types.ts'
import { acceptsLanguages } from '@std/http/negotiation'
import { contentType as _contentType } from '@std/media-types/content-type'
import { extname } from '@std/path/posix/extname'
import { normalize } from '@std/path/posix/normalize'
import { fromFileUrl } from '@std/path/posix/from-file-url'
import { toFileUrl } from '@std/path/posix/to-file-url'

const handlerMap: Map<string, string | Handler> = new Map([
  ['deno-ver', 'deno-ver/main.ts'],
  ['count', 'count/main.ts'],
  ['headers', 'headers/main.ts'],
  ['fetch', 'fetch/main.ts'],
  ['event-stream', 'event-stream/main.ts'],
  ['d', 'd/main.ts'],
])

const i18nDir = 'i18n'
const webrootDir = 'webroot'

const defaultHeaders: [string, string][] = [
  ['strict-transport-security', 'max-age=31536000'],
]

const _contentTypeCache: Record<string, string> = Object.create(null)
const contentType: typeof _contentType = (ext) => {
  return _contentTypeCache[ext] ?? (_contentTypeCache[ext] = _contentType(ext) ?? '')
}

let langs: Set<string>
let langsNextUpdate = 0

function normalizePath(path: string) {
  return normalize(`/${path}/`).slice(1, -1)
}

function pathFrom(url: URL) {
  const fileURL = new URL('file:///')
  fileURL.pathname = url.pathname
  return normalizePath(fromFileUrl(fileURL))
}

function pathTo(path: string, url: URL) {
  url.pathname = toFileUrl(`/${path}`).pathname.replaceAll('^', '%5E').replaceAll('|', '%7C')
  return url
}

function isFile(path: string) {
  try {
    return Deno.lstatSync(path).isFile
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e
    return false
  }
}

const defaultHandler: Handler = (req) => {
  const url = new URL(req.url)

  if (Date.now() >= langsNextUpdate) {
    langs = new Set([...Deno.readDirSync(i18nDir)].map(({ name }) => name.split('.')[0]))
    langsNextUpdate = Date.now() + 300000
  }

  const path = pathFrom(url)

  if (!path || langs.has(path)) {
    if (url.pathname !== `/${path}`) {
      return Response.redirect(new URL(`/${path}`, url), 301)
    }
    const lang = path || acceptsLanguages(req, ...langs) || 'en'
    const file = Deno.openSync(`${webrootDir}/${lang}.html`)
    return new Response(file.readable, {
      headers: {
        'content-type': contentType('.html'),
        'content-length': `${file.statSync().size}`,
      },
    })
  }

  const realPath = `${webrootDir}/${path}`
  if (isFile(realPath)) {
    let lang
    if (path.endsWith('.html') && langs.has(lang = path.slice(0, -5))) {
      return Response.redirect(new URL(`/${lang}`, url), 301)
    }
    const normalizedURL = pathTo(path, new URL(url))
    if (url.pathname !== normalizedURL.pathname) {
      return Response.redirect(normalizedURL, 301)
    }

    const headers: Record<string, string> = {}
    if (path.split('/').every((p) => p[0] !== '.')) {
      headers['cache-control'] = 'public, max-age=31536000'
    }
    const type = contentType(extname(path))
    if (type) {
      headers['content-type'] = type
    }
    const file = Deno.openSync(realPath)
    headers['content-length'] = `${file.statSync().size}`
    return new Response(file.readable, { headers })
  }
}

function httpRedirectToHTTPS() {
  Deno.serve({
    hostname: Deno.env.get('IP'),
    port: 80,
  }, (req) => {
    const url = new URL(req.url)
    url.protocol = 'https'
    return Response.redirect(url, 301)
  })
}

const certPath = Deno.env.get('CERT')
const keyPath = Deno.env.get('KEY')

const options: {
  hostname?: string
  port?: number
  onListen?: (localAddr: Deno.NetAddr) => void
  onError?: (error: unknown) => Response | Promise<Response>
  cert?: string
  key?: string
} = {
  hostname: Deno.env.get('IP'),
  port: Number(Deno.env.get('PORT')) || undefined,
  onListen({ hostname, port }) {
    if (hostname.includes(':')) {
      hostname = `[${hostname}]`
    }
    if (certPath) {
      console.log(`Listening on https://${hostname}:${port}/`)
      if (port === 443) {
        httpRedirectToHTTPS()
      }
    } else {
      console.log(`Listening on http://${hostname}:${port}/`)
    }
  },
  onError(e) {
    console.error(e)
    return new Response('500 Internal Server Error', { status: 500 })
  },
}

const handler: Deno.ServeHandler = async (req, info) => {
  const url = new URL(req.url)
  const key = url.pathname.match(/[^/]+/)?.[0]
  let handler
  if (key && (handler = handlerMap.get(key))) {
    if (typeof handler === 'string') {
      handler = (await import(`./${handler}`)).handler as Handler
      handlerMap.set(key, handler)
    }
  } else {
    handler = defaultHandler
  }
  let resp = await handler(req, info)
  if (!resp) {
    resp = new Response('404 Not Found', { status: 404 })
  }
  try {
    for (const [k, v] of defaultHeaders) {
      if (!resp.headers.has(k)) {
        resp.headers.set(k, v)
      }
    }
  } catch {
    const headers = [...resp.headers]
    for (const h of defaultHeaders) {
      if (!resp.headers.has(h[0])) {
        headers.push(h)
      }
    }
    resp = new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers })
  }
  return resp
}

function serve() {
  options.cert = certPath && Deno.readTextFileSync(certPath)
  options.key = keyPath && Deno.readTextFileSync(keyPath)
  return Deno.serve(options, handler)
}

let server: Deno.HttpServer | null = serve()

Deno.addSignalListener('SIGHUP', async () => {
  if (!server) return
  console.log('Reloading...')
  const promise = server.shutdown()
  server = null
  await promise
  server = serve()
})
