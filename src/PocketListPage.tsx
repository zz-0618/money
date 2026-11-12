import {FormEvent,useEffect,useMemo,useRef,useState} from 'react'
import {Check,ChevronDown,ExternalLink,Grid2X2,Link,Map,MapPin,Pencil,Plus,Search,Star,Trash2,X} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import {supabase} from './supabase'

type PocketList={id:string;user_id:string;name:string;icon_name:string;sort_order:number}
type PocketPlace={id:string;user_id:string;list_id:string;place_id?:string|null;name:string;address?:string|null;google_maps_url?:string|null;latitude?:number|null;longitude?:number|null;visited:boolean;rating?:number|null;review?:string|null;created_at?:string}
type PlaceResult={place_id:string;name:string;address?:string;google_maps_url?:string;latitude?:number;longitude?:number}
const icons=Object.entries(LucideIcons).filter(([name,Icon]:any)=>/^[A-Z]/.test(name)&&(typeof Icon==='object'||typeof Icon==='function')).map(([name,Icon]:any)=>({name,Icon})).sort((a,b)=>a.name.localeCompare(b.name))
function ListIcon({name,size=22}:any){const match:any=icons.find(x=>x.name===name);const Icon=match?.Icon||MapPin;return <Icon size={size}/>} 
let runtimeConfigPromise:Promise<{googleMapsApiKey:string;googleMapId?:string}>|null=null
async function getRuntimeConfig(){
 if(!runtimeConfigPromise)runtimeConfigPromise=fetch('/api/runtime-config',{headers:{accept:'application/json'},cache:'no-store'}).then(async response=>{const text=await response.text();let data:any={};try{data=JSON.parse(text)}catch{throw new Error(`Runtime config 回傳的不是 JSON（HTTP ${response.status}）`)}if(!response.ok||data?.ok===false)throw new Error(data?.error||`Runtime config 載入失敗（HTTP ${response.status}）`);const googleMapsApiKey=String(data?.googleMapsApiKey||'').trim();if(!googleMapsApiKey)throw new Error('Cloudflare runtime 尚未設定 VITE_GOOGLE_MAPS_API_KEY');return{googleMapsApiKey,googleMapId:String(data?.googleMapId||'').trim()||undefined}}).catch(error=>{runtimeConfigPromise=null;throw error})
 return runtimeConfigPromise
}
async function loadGoogleMaps(){
 const w:any=window;if(w.google?.maps)return
 const config=await getRuntimeConfig()
 await new Promise<void>((resolve,reject)=>{const existing=document.querySelector('script[data-pocket-google-maps]') as HTMLScriptElement|null;if(existing){if(w.google?.maps)return resolve();existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',()=>reject(new Error('Google Maps 載入失敗')),{once:true});return}const script=document.createElement('script');script.dataset.pocketGoogleMaps='1';script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(config.googleMapsApiKey)}&libraries=marker&v=weekly`;script.async=true;script.defer=true;script.onload=()=>resolve();script.onerror=()=>reject(new Error('Google Maps 載入失敗，請檢查 API Key、網域限制及 Maps JavaScript API 是否已啟用'));document.head.appendChild(script)})
}
export default function PocketListPage({user,done}:any){
 const[lists,setLists]=useState<PocketList[]>([]),[places,setPlaces]=useState<PocketPlace[]>([]),[mode,setMode]=useState<'list'|'map'>('list'),[activeList,setActiveList]=useState('all'),[listEditor,setListEditor]=useState<PocketList|null|undefined>(),[placeEditor,setPlaceEditor]=useState<PocketPlace|null|undefined>(),[selected,setSelected]=useState<PocketPlace|null>(null)
 async function load(){const[l,p]=await Promise.all([supabase.from('pocket_lists').select('*').order('sort_order'),supabase.from('pocket_places').select('*').order('created_at',{ascending:false})]);if(l.error)return done(l.error.message,false);if(p.error)return done(p.error.message,false);setLists(l.data||[]);setPlaces(p.data||[])}
 useEffect(()=>{load()},[])
 const visible=useMemo(()=>places.filter(x=>activeList==='all'||x.list_id===activeList),[places,activeList])
 async function removePlace(id:string){
  if(!confirm('確定刪除這個地點？'))return
  try{
    const{data,error}=await supabase.rpc('pocket_place_delete',{p_id:id})
    if(error)throw error
    if(!data)throw new Error('找不到地點或沒有刪除權限')
    setSelected(null)
    await load()
    done('地點已刪除',false)
  }catch(error:any){
    console.error('Pocket place delete failed',error)
    done(`地點刪除失敗：${error?.message||String(error)}`,false)
  }
}
 return <><div className="pocket-toolbar"><div className="pocket-seg"><button className={mode==='map'?'on':''} onClick={()=>setMode('map')}><Map size={18}/>Google 地圖</button><button className={mode==='list'?'on':''} onClick={()=>setMode('list')}><Grid2X2 size={18}/>清單</button></div><button className="pocket-list-add" onClick={()=>setListEditor(null)}><Plus size={18}/>新增清單</button></div><div className="pocket-list-tabs"><button className={activeList==='all'?'on':''} onClick={()=>setActiveList('all')}>全部</button>{lists.map(list=><button className={activeList===list.id?'on':''} onClick={()=>setActiveList(list.id)} onDoubleClick={()=>setListEditor(list)} key={list.id}><ListIcon name={list.icon_name} size={18}/>{list.name}<small>{places.filter(x=>x.list_id===list.id).length}</small></button>)}</div>{mode==='map'?<PocketMap places={visible} lists={lists} onSelect={setSelected} done={done}/>:<section className="pocket-place-grid">{visible.map(place=>{const list=lists.find(x=>x.id===place.list_id);return <button className="pocket-place-card" onClick={()=>setSelected(place)} key={place.id}><span className="pocket-place-icon"><ListIcon name={list?.icon_name}/></span><span><b>{place.name}</b><small>{place.address||'尚未提供地址'}</small><em className={place.visited?'visited':'unvisited'}>{place.visited?'已訪問':'未訪問'}</em></span>{place.visited&&place.rating&&<strong><Star size={15}/>{place.rating}</strong>}</button>})}</section>}<button className="floating-add" onClick={()=>setPlaceEditor(null)}><Plus/></button>{listEditor!==undefined&&<PocketListEditor user={user} row={listEditor} lists={lists} done={done} reload={load} close={()=>setListEditor(undefined)}/>} {placeEditor!==undefined&&<PocketPlaceEditor user={user} row={placeEditor} lists={lists} done={done} reload={load} close={()=>setPlaceEditor(undefined)}/>} {selected&&<div className="modal"><div className="panel pocket-detail"><button className="modal-close" onClick={()=>setSelected(null)}><X/></button><button className="pocket-edit" onClick={()=>{setPlaceEditor(selected);setSelected(null)}}><Pencil/></button><span className="pocket-detail-icon"><ListIcon name={lists.find(x=>x.id===selected.list_id)?.icon_name} size={28}/></span><h2>{selected.name}</h2><small>{selected.address}</small><div className="pocket-detail-status"><b>{selected.visited?'已訪問':'未訪問'}</b>{selected.rating&&<span><Star size={16}/>{selected.rating}</span>}</div>{selected.review&&<p>{selected.review}</p>}{selected.google_maps_url&&<a href={selected.google_maps_url} target="_blank" rel="noreferrer"><ExternalLink size={17}/>在 Google Maps 開啟</a>}<button className="delete-full" onClick={()=>removePlace(selected.id)}><Trash2 size={17}/>刪除地點</button></div></div>}</>
}
function PocketListEditor({user,row,lists,done,reload,close}:any){const[name,setName]=useState(row?.name||''),[icon,setIcon]=useState(row?.icon_name||'MapPin'),[search,setSearch]=useState('');const shown=icons.filter(x=>!search||x.name.toLowerCase().includes(search.toLowerCase())).slice(0,80);async function save(e:FormEvent){e.preventDefault();const payload={user_id:user.id,name:name.trim(),icon_name:icon,sort_order:row?.sort_order??lists.length};const q=row?.id?supabase.from('pocket_lists').update(payload).eq('id',row.id):supabase.from('pocket_lists').insert(payload);const{error}=await q;if(error)return done(error.message,false);close();reload();done('清單已儲存',false)}return <div className="modal"><form className="panel pocket-editor" onSubmit={save}><button type="button" className="modal-close" onClick={close}><X/></button><h2>{row?'編輯':'新增'}清單</h2><label>清單名稱<input value={name} onChange={e=>setName(e.target.value)} required/></label><label>Lucide 圖示<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜尋圖示英文名稱"/></label><div className="pocket-icon-grid">{shown.map(({name,Icon}:any)=><button type="button" title={name} className={icon===name?'on':''} onClick={()=>setIcon(name)} key={name}><Icon size={23}/><small>{name}</small></button>)}</div><button>儲存</button></form></div>}
function PocketPlaceEditor({user,row,lists,done,reload,close}:any){const[query,setQuery]=useState(row?.google_maps_url||row?.name||''),[results,setResults]=useState<PlaceResult[]>([]),[searching,setSearching]=useState(false),[picked,setPicked]=useState<PlaceResult|null>(row?{place_id:row.place_id||'',name:row.name,address:row.address||'',google_maps_url:row.google_maps_url||'',latitude:row.latitude||undefined,longitude:row.longitude||undefined}:null),[listId,setListId]=useState(row?.list_id||lists[0]?.id||''),[visited,setVisited]=useState(!!row?.visited),[rating,setRating]=useState(String(row?.rating||'')),[review,setReview]=useState(row?.review||'');async function searchPlace(){if(!query.trim())return;setSearching(true);try{const{data,error}=await supabase.functions.invoke('google-places-search',{body:{query:query.trim()}});if(error)throw error;if(data?.error)throw new Error(data.error);const next=(data?.places||[]).map((x:any)=>({place_id:x.place_id,name:x.name,address:x.address,google_maps_url:x.google_maps_url,latitude:x.latitude??x.lat,longitude:x.longitude??x.lng}));setResults(next);if(!next.length)done('找不到地點，請換一個名稱或 Google Maps 連結',false)}catch(error:any){done(error?.message||'Google 地點搜尋失敗',false)}finally{setSearching(false)}}async function save(e:FormEvent){
 e.preventDefault()
 if(!picked)return done('請先搜尋並選擇地點',false)
 if(!listId)return done('請先新增或選擇清單',false)
 const latitude=picked.latitude==null?null:Number(picked.latitude)
 const longitude=picked.longitude==null?null:Number(picked.longitude)
 if(latitude==null||longitude==null||!Number.isFinite(latitude)||!Number.isFinite(longitude))return done('這個 Google 地點沒有取得經緯度，請重新按搜尋並選擇地點後再儲存',false)
 if(latitude<-90||latitude>90||longitude<-180||longitude>180)return done('Google 地點回傳的經緯度格式不正確，請重新搜尋',false)
 try{
  const{data,error}=await supabase.rpc('pocket_place_save',{
   p_id:row?.id||null,
   p_list_id:listId,
   p_place_id:picked.place_id||null,
   p_name:picked.name.trim(),
   p_address:picked.address?.trim()||null,
   p_google_maps_url:picked.google_maps_url||query||null,
   p_latitude:latitude,
   p_longitude:longitude,
   p_visited:visited,
   p_rating:visited&&rating?Number(rating):null,
   p_review:visited&&review.trim()?review.trim():null,
  })
  if(error)throw error
  if(!data)throw new Error('資料庫未回傳地點編號')
  close()
  await reload()
  done(row?.id?'地點已更新':'地點已加入口袋名單',false)
 }catch(error:any){
  console.error('Pocket place RPC save failed',error)
  done(`地點儲存失敗：${error?.message||error?.details||error?.hint||String(error)}`,false)
 }
}
return <div className="modal"><form className="panel pocket-editor" onSubmit={save}><button type="button" className="modal-close" onClick={close}><X/></button><h2>{row?'編輯':'新增'}地點</h2><label>Google 連結或地點名稱<div className="pocket-search"><input value={query} onChange={e=>{setQuery(e.target.value);setPicked(null)}} required/><button type="button" onClick={searchPlace} disabled={searching}>{searching?'搜尋中':'搜尋'}</button></div></label>{results.length>0&&<div className="pocket-results">{results.map(x=><button type="button" className={picked?.place_id===x.place_id?'on':''} onClick={()=>{setPicked(x);setQuery(x.google_maps_url||x.name);setResults([])}} key={x.place_id}><b>{x.name}</b><small>{x.address}</small></button>)}</div>}{picked&&<div className="pocket-picked"><Check size={18}/><span><b>{picked.name}</b><small>{picked.address}</small></span></div>}<label>加入清單<select value={listId} onChange={e=>setListId(e.target.value)} required><option value="">請選擇清單</option>{lists.map((x:PocketList)=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label><label className="pocket-visited"><input type="checkbox" checked={visited} onChange={e=>setVisited(e.target.checked)}/>已訪問</label>{visited&&<><label>評分（非必填）<select value={rating} onChange={e=>setRating(e.target.value)}><option value="">不評分</option>{[1,2,3,4,5].map(x=><option value={x} key={x}>{x} 星</option>)}</select></label><label>心得（非必填）<textarea value={review} onChange={e=>setReview(e.target.value)}/></label></>}<button>儲存</button></form></div>}
function PocketMap({places,lists,onSelect,done}:any){const ref=useRef<HTMLDivElement>(null);useEffect(()=>{let disposed=false;loadGoogleMaps().then(async()=>{if(disposed||!ref.current)return;const g:any=(window as any).google;const valid=places.filter((x:PocketPlace)=>Number.isFinite(Number(x.latitude))&&Number.isFinite(Number(x.longitude)));const center=valid.length?{lat:Number(valid[0].latitude),lng:Number(valid[0].longitude)}:{lat:23.7,lng:121};const config=await getRuntimeConfig();const map=new g.maps.Map(ref.current,{center,zoom:valid.length?11:7,mapId:config.googleMapId});const bounds=new g.maps.LatLngBounds();valid.forEach((place:PocketPlace)=>{const list=lists.find((x:PocketList)=>x.id===place.list_id);const iconName=list?.icon_name||'MapPin';const iconEntry:any=icons.find(x=>x.name===iconName);const IconComp:any=iconEntry?.Icon||MapPin;const markerHost=document.createElement('div');markerHost.className='pocket-map-list-marker';const root=(await import('react-dom/client')).createRoot(markerHost);root.render(<IconComp size={21}/>);const marker=g.maps.marker?.AdvancedMarkerElement?new g.maps.marker.AdvancedMarkerElement({map,position:{lat:Number(place.latitude),lng:Number(place.longitude)},title:place.name,content:markerHost}):new g.maps.Marker({map,position:{lat:Number(place.latitude),lng:Number(place.longitude)},title:place.name});marker.addListener('click',()=>onSelect(place));bounds.extend(marker.position||marker.getPosition())});if(valid.length>1)map.fitBounds(bounds)}).catch((error:any)=>done(error.message,false));return()=>{disposed=true}},[JSON.stringify(places),JSON.stringify(lists)]);return <div className="pocket-map" ref={ref}/>} 
