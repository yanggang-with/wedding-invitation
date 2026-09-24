import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'

function devHtmlPlugin(): Plugin {
  return {
    name: 'dev-html-plugin',
    apply: 'serve',
    transformIndexHtml(html: string) {
      return html
        .replace('<script type="module" src="./assets/app.js"></script>', '<script type="module" src="/src/main.ts"></script>')
        .replace('<link rel="stylesheet" crossorigin href="./assets/style.css" />', '')
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), devHtmlPlugin()],
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'src/main.ts',
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/style.css'
          }
          return 'assets/[name].[ext]'
        }
      }
    }
  },
  server: {
    allowedHosts: ['zen-cover-neuron.ngrok-free.dev'],
  }
})