export default defineNuxtConfig({
  ssr: false,
  css: ['~/assets/main.css'],
  app: { head: { title: 'Mon suivi calories', meta: [
    { name: 'description', content: 'Suivez vos repas, vos calories, vos recettes et vos produits.' },
    { name: 'theme-color', content: '#0d3b3d' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }
  ], link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
    { rel: 'manifest', href: '/site.webmanifest' }
  ] } },
  compatibilityDate: '2025-07-01'
})
