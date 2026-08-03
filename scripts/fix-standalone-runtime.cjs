const fs = require('fs')
const path = require('path')

const root = process.cwd()
const sourceDir = path.join(root, '.next', 'server', 'chunks')
const destinationDir = path.join(root, '.next', 'standalone', '.next', 'chunks')
const runtimeSource = path.join(sourceDir, 'ssr', '[turbopack]_runtime.js')
const runtimeDestination = path.join(destinationDir, 'ssr', '[turbopack]_runtime.js')

if (!fs.existsSync(runtimeSource)) {
  console.warn('[fix-standalone-runtime] Runtime SSR não encontrado; nada a copiar.')
  process.exit(0)
}

if (fs.existsSync(runtimeDestination)) {
  console.log('[fix-standalone-runtime] Runtime SSR já presente no standalone.')
  process.exit(0)
}

fs.mkdirSync(destinationDir, { recursive: true })
fs.cpSync(sourceDir, destinationDir, { recursive: true, force: true })

console.log('[fix-standalone-runtime] Chunks SSR copiados para .next/standalone/.next/chunks')
