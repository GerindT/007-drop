// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  
  modules: ['@nuxtjs/supabase'],
  
  supabase: {
    redirect: false, // No auth redirects needed for this app
  },
  
  css: ['~/assets/css/main.css'],
  
  app: {
    head: {
      title: '007-Drop | Secure File Transfer',
      meta: [
        { name: 'description', content: 'Self-destructing encrypted file sharing. Upload, share, vanish.' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap' }
      ]
    }
  }
})
