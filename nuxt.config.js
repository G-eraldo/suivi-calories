export default defineNuxtConfig({
  ssr: false,
  css: ['~/assets/main.css'],
  app: { head: { title: 'Mon suivi calories', meta: [{ name: 'description', content: 'Suivez vos repas, vos calories, vos recettes et vos produits.' }], link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }] } },
  compatibilityDate: '2025-07-01'
})
