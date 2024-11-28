import { join } from '@std/path/posix/join'
import { normalize } from '@std/path/posix/normalize'
import { parse } from '@std/path/posix/parse'
import { toFileUrl } from '@std/path/posix/to-file-url'

const inDir = 'web'
const i18nDir = 'i18n'
const outDir = 'webroot'

const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!$+,-;=@[]_~'

const dirs = Object.create(null)

const textEncoder = new TextEncoder()

async function hash(data: BufferSource) {
  return new Uint32Array(await crypto.subtle.digest('SHA-1', data)).reduce((s, x) => s + chars[x % chars.length], '')
}

async function replace(text: string, regex: RegExp, fn: (...m: string[]) => string | PromiseLike<string>) {
  let result = ''
  let left = 0
  for (const m of text.matchAll(regex)) {
    result += text.slice(left, m.index)
    result += await fn(...m)
    left = m.index + m[0].length
  }
  return result + text.slice(left)
}

function isFile(path: string) {
  try {
    return Deno.lstatSync(path).isFile
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e
    return false
  }
}

function resolvePath(path: string, parent = '') {
  if (path !== normalize(path)) throw new Error(`Invalid path: ${path}`)
  const { dir, base, name, ext } = parse(path)
  const fullPath = join(parent, path)
  const fullDir = join(parent, dir)
  let files = dirs[fullDir]
  if (!files) {
    if (isFile(`${inDir}/${fullPath}`)) return [path, dir, base, name, ext]
    files = dirs[dir] = Object.fromEntries(
      [...Deno.readDirSync(`${inDir}/${fullDir}`)]
        .filter(({ isFile }) => isFile)
        .map(({ name }) => [name.replace(/\.\d+(?:\..*)?(?=\.[^.]*$)/, ''), name]),
    )
  }
  return [join(dir, files[base]), dir, files[base], name, ext]
}

async function dfs(
  path_: string,
  i18n: Record<string, string>,
  parent: string,
  vis: Record<string, string>,
  outPath?: string,
) {
  const [path, dir, base, name, ext] = resolvePath(path_, parent)
  const fullPath = join(parent, path)
  let v = vis[fullPath]
  if (v === '') throw new Error(`Cyclic dependency: ${fullPath}`)
  if (!v) {
    vis[fullPath] = ''
    const fullDir = join(parent, dir)
    try {
      Deno.mkdirSync(`${outDir}/${outPath ? parse(outPath).dir : fullDir}`, { recursive: true })
    } catch {
      // pass
    }
    if (path === path_ && (ext === '.html' || ext === '.css' || ext === '.js')) {
      let text = Deno.readTextFileSync(`${inDir}/${fullPath}`)
      text = text.replace(/([>"'`]){{(\w+)}}/g, (m, left, k) => {
        let v = i18n[k]
        if (!v) return m
        if (left === '>') {
          v = v.replace(/&/g, '&amp;').replace(/</g, '&lt;')
        } else if (left === '`') {
          v = v.replace(/[\\`]|\$\{/g, (m) => `\\${m}`)
        } else if (left === '"') {
          if (ext === '.html') {
            v = v.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
          } else {
            v = v.replace(/[\\"]/g, (m) => `\\${m}`)
          }
        } else {
          if (ext === '.html') {
            v = v.replace(/&/g, '&amp;').replace(/'/g, '&#39;')
          } else {
            v = v.replace(/[\\']/g, (m) => `\\${m}`)
          }
        }
        return left + v
      })
      text = await replace(
        text,
        /( (?:data-)?(?:href|src)=|\bimport .*)(["'])(?![\w-]*:|\/\/)(.+?)\2/g,
        async (_, pre, left, path) => {
          path = await dfs(path, i18n, fullDir, vis)
          return pre + left + path + left
        },
      )
      const data = textEncoder.encode(text)
      v = vis[fullPath] = outPath || `${name}.${await hash(data)}${ext}`
      try {
        Deno.writeFileSync(`${outDir}/${outPath || `${fullDir}/${v}`}`, data, { createNew: true })
      } catch (e) {
        if (!(e instanceof Deno.errors.AlreadyExists)) {
          throw e
        }
      }
    } else {
      v = vis[fullPath] = base
      Deno.copyFileSync(`${inDir}/${fullPath}`, `${outDir}/${outPath || fullPath}`)
    }
  }
  return outPath || toFileUrl(`/${dir}/${v}`).pathname.slice(1)
}

try {
  Deno.removeSync(outDir, { recursive: true })
} catch {
  // pass
}
for (const { name } of Deno.readDirSync(i18nDir)) {
  const text = Deno.readTextFileSync(`${i18nDir}/${name}`)
  const i18n = Object.create(null)
  i18n.lang = name.split('.')[0]
  for (const [, k, v] of text.matchAll(/(\w+) (.+?)\n\n/sg)) {
    i18n[k] = v
  }
  await dfs('index.html', i18n, '', Object.create(null), i18n.lang + '.html')
}
