import { createServer } from 'node:http'
import { createHash, timingSafeEqual } from 'node:crypto'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import handler from '../dist/server/index.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const username = process.env.APP_USERNAME
const password = process.env.APP_PASSWORD
if (!username || !password) throw new Error('Définis APP_USERNAME et APP_PASSWORD dans les variables Dokploy.')

const dbPath = resolve(process.env.DB_PATH || join(root, 'data/miametrie.sqlite'))
mkdirSync(dirname(dbPath), { recursive: true })
const sqlite = new DatabaseSync(dbPath)
sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;')
const migration = readFileSync(new URL('../drizzle/0000_serious_famine.sql', import.meta.url), 'utf8')
for (const statement of migration.split('--> statement-breakpoint')) {
  const sql = statement.trim().replace(/^CREATE (TABLE|INDEX) /, 'CREATE $1 IF NOT EXISTS ')
  if (sql) sqlite.exec(sql)
}

const DB = {
  prepare(sql) {
    const statement = sqlite.prepare(sql)
    return {
      bind(...params) {
        return {
          async first() { return statement.get(...params) || null },
          async all() { return { results: statement.all(...params) } },
          async run() { return statement.run(...params) }
        }
      }
    }
  }
}

function authorized(header) {
  if (!header?.startsWith('Basic ')) return false
  const supplied = Buffer.from(header.slice(6), 'base64').toString('utf8')
  const expectedHash = createHash('sha256').update(`${username}:${password}`).digest()
  const suppliedHash = createHash('sha256').update(supplied).digest()
  return timingSafeEqual(expectedHash, suppliedHash)
}

const server = createServer(async (req, res) => {
  if (req.url === '/health') { res.writeHead(200).end('ok'); return }
  if (!authorized(req.headers.authorization)) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Miamétrie", charset="UTF-8"' }).end('Authentification requise.')
    return
  }
  try {
    const chunks = []
    let size = 0
    for await (const chunk of req) {
      size += chunk.length
      if (size > 1024 * 1024) { res.writeHead(413).end('Requête trop volumineuse.'); return }
      chunks.push(chunk)
    }
    const headers = new Headers(req.headers)
    headers.set('oai-authenticated-user-id', username)
    const request = new Request(`http://localhost${req.url}`, {
      method: req.method,
      headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
      duplex: 'half'
    })
    const response = await handler.fetch(request, { DB })
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch (error) {
    console.error('Request failed', error)
    if (!res.headersSent) res.writeHead(500).end('Erreur du serveur.')
  }
})

const port = Number(process.env.PORT || 3000)
server.listen(port, '0.0.0.0', () => console.log(`Miamétrie écoute sur le port ${port}`))
