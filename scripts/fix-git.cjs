const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const gitIndexPath = path.join(__dirname, '..', '.git', 'index')
const gitLockPath = path.join(__dirname, '..', '.git', 'index.lock')

try {
  if (fs.existsSync(gitLockPath)) {
    fs.unlinkSync(gitLockPath)
    console.log('Removed stale .git/index.lock')
  }

  if (fs.existsSync(gitIndexPath)) {
    const stats = fs.statSync(gitIndexPath)
    if (stats.size === 0) {
      fs.unlinkSync(gitIndexPath)
      console.log('Removed corrupted 0-byte .git/index')
    }
  }

  execSync('git reset', { stdio: 'inherit' })
  console.log('Git index successfully restored!')
} catch (err) {
  console.error('Failed to fix git index:', err.message)
}

