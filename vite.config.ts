import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {VitePWA} from 'vite-plugin-pwa'

export default defineConfig({
  plugins:[
    react(),
    VitePWA({
      registerType:'autoUpdate',
      includeAssets:['favicon.ico','apple-touch-icon.png'],
      manifest:{
        name:'財日記',short_name:'財日記',description:'可離線使用的記帳、待辦與日記',
        theme_color:'#050505',background_color:'#050505',display:'standalone',start_url:'/',
        icons:[
          {src:'/pwa-192x192.png',sizes:'192x192',type:'image/png'},
          {src:'/pwa-512x512.png',sizes:'512x512',type:'image/png'},
          {src:'/pwa-512x512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}
        ]
      },
      workbox:{
        navigateFallback:'/index.html',
        globPatterns:['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        runtimeCaching:[{
          urlPattern:({url})=>url.hostname.includes('supabase.co'),
          handler:'NetworkOnly',options:{backgroundSync:{name:'supabase-network-fallback',options:{maxRetentionTime:24*60}}}
        }]
      }
    })
  ]
})
