export interface Env {
  ASSETS: Fetcher
  VITE_GOOGLE_MAPS_API_KEY?: string
  GOOGLE_MAPS_API_KEY?: string
  VITE_GOOGLE_MAP_ID?: string
  GOOGLE_MAP_ID?: string
}

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, max-age=0',
    'x-content-type-options':'nosniff',
  },
})

export default {
  async fetch(request:Request,env:Env):Promise<Response>{
    const url=new URL(request.url)

    if(url.pathname==='/api/runtime-config'){
      if(request.method!=='GET')return json({ok:false,error:'Method not allowed'},405)
      const googleMapsApiKey=String(env.VITE_GOOGLE_MAPS_API_KEY||env.GOOGLE_MAPS_API_KEY||'').trim()
      const googleMapId=String(env.VITE_GOOGLE_MAP_ID||env.GOOGLE_MAP_ID||'').trim()
      if(!googleMapsApiKey){
        return json({ok:false,error:'Cloudflare Worker runtime 尚未設定 VITE_GOOGLE_MAPS_API_KEY'},503)
      }
      return json({ok:true,googleMapsApiKey,googleMapId:googleMapId||null})
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
