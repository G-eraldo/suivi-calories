import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, relative } from 'node:path'
execFileSync('node', ['node_modules/nuxt/bin/nuxt.mjs', 'generate'], { stdio: 'inherit' })
const root = '.output/public', out = 'dist/server'
const assets = {}
function walk(dir) { for (const ent of readdirSync(dir, { withFileTypes: true })) { const path = join(dir, ent.name); if (ent.isDirectory()) walk(path); else assets[relative(root, path).replaceAll('\\', '/')] = readFileSync(path).toString('base64') } }
walk(root)
rmSync('dist', { recursive: true, force: true }); mkdirSync(out, { recursive: true })
const worker = readFileSync('server/worker.js', 'utf8').replace('export function createHandler(assets)', 'function createHandler(assets)') + '\nexport default createHandler(' + JSON.stringify(assets) + ');\n'
writeFileSync(join(out, 'index.js'), worker)
