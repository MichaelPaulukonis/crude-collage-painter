// vite.config.js
const { resolve } = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
  base: process.env.DEPLOY_ENV === 'GH_PAGES' ? '/crude-collage-painter/' : '',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
})