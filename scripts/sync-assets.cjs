const fs = require('fs')
const path = require('path')

const rootDir = path.join(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const distAssets = path.join(distDir, 'assets')
const rootAssets = path.join(rootDir, 'assets')

// 1. Copy dist/assets to root assets/ (for direct branch root deployment)
if (!fs.existsSync(rootAssets)) {
  fs.mkdirSync(rootAssets, { recursive: true })
}
if (fs.existsSync(distAssets)) {
  const files = fs.readdirSync(distAssets)
  for (const file of files) {
    fs.copyFileSync(path.join(distAssets, file), path.join(rootAssets, file))
    console.log(`Synced ${file} to assets/`)
  }
}

// 1-1. Copy public favicons to root directory
const publicDir = path.join(rootDir, 'public')
if (fs.existsSync(publicDir)) {
  const publicFiles = fs.readdirSync(publicDir)
  for (const file of publicFiles) {
    if (file.startsWith('favicon')) {
      fs.copyFileSync(path.join(publicDir, file), path.join(rootDir, file))
      console.log(`Synced ${file} to root/`)
    }
  }
}

// 2. Copy and transform root index.html to dist/index.html (substituting %VITE_...% env variables)
const indexHtmlPath = path.join(rootDir, 'index.html')
if (fs.existsSync(indexHtmlPath)) {
  let htmlContent = fs.readFileSync(indexHtmlPath, 'utf8')

  // Parse .env if present
  let naverKey = process.env.VITE_APP_NAVERMAP_KEY || ''
  const envPath = path.join(rootDir, '.env')
  if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of envLines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('VITE_APP_NAVERMAP_KEY=')) {
        naverKey = trimmed.replace('VITE_APP_NAVERMAP_KEY=', '').trim()
        break
      }
    }
  }

  htmlContent = htmlContent.replace(/%VITE_APP_NAVERMAP_KEY%/g, naverKey)
  fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent, 'utf8')
  console.log('Synced and transformed index.html to dist/index.html')
}

