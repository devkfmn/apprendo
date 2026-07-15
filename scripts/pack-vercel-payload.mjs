import fs from 'node:fs'

const files = JSON.parse(fs.readFileSync('_vercel_files.json', 'utf8'))
const norm = (file) => file.replaceAll('\\', '/')

const allow = (file) => {
  const name = norm(file)
  if (/\.(png|jpe?g|gif|webp)$/i.test(name)) return false
  if (name.startsWith('src/assets/')) return false
  if (
    ['package.json', 'package-lock.json', 'index.html', 'vite.config.ts', '.env'].includes(
      name,
    )
  ) {
    return true
  }
  if (name.startsWith('tsconfig')) return true
  if (name.startsWith('src/')) return true
  if (name.startsWith('public/')) return true
  return false
}

const slim = files
  .filter((entry) => allow(entry.file))
  .map((entry) => ({ ...entry, file: norm(entry.file) }))

const payload = {
  target: 'production',
  name: 'apprendo',
  teamId: 'team_lyp3ra6iH4rPEQykVF0t59F6',
  projectSettings: {
    framework: 'vite',
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
  },
  files: slim,
}

fs.writeFileSync('_vercel_payload.json', JSON.stringify(payload))
console.log('count', slim.length, 'size', fs.statSync('_vercel_payload.json').size)
