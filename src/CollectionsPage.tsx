// CollectionsPage.tsx 的 ArticleEditor 內加入
import { getArticlePreview } from './articlePreview'

// URL input 改成自動觸發（原按鈕仍可保留作重試）
const lastFetchedUrl = useRef('')
const autoTimer = useRef<number | null>(null)
function queueAutoFetch(nextUrl:string){
 setUrl(nextUrl);setPlatform(platformOf(nextUrl));setFetchMessage(null)
 if(autoTimer.current) window.clearTimeout(autoTimer.current)
 const value=nextUrl.trim()
 if(!/^https?:\/\//i.test(value)||value===lastFetchedUrl.current)return
 autoTimer.current=window.setTimeout(()=>fetchMeta(value),350)
}

// 用這版取代原 fetchMeta；支援 paste 後自動讀取與 9.5 秒前端逾時
async function fetchMeta(forcedUrl?:string){
 const inputUrl=(forcedUrl??url).trim()
 if(!inputUrl){setFetchMessage({type:'error',text:'請先貼上文章連結'});return}
 setFetching(true);setFetchMessage(null)
 try{
  const data=await getArticlePreview(inputUrl,9500)
  lastFetchedUrl.current=inputUrl
  const nextTitle=String(data.title||'').trim(),nextBody=String(data.body||'').trim()
  const candidateImages=[data.image_url,...(Array.isArray(data.image_urls)?data.image_urls:[])].filter((v,i,a):v is string=>typeof v==='string'&&/^https?:\/\//i.test(v)&&a.indexOf(v)===i)
  setTitle(nextTitle||nextBody.slice(0,70)||'未命名文章');setBody(nextBody);setImages(candidateImages);setImage(candidateImages[0]||'')
  setUrl(String(data.resolved_url||data.url||inputUrl));setPlatform(String(data.platform||platformOf(inputUrl)))
  setFetchMessage({type:'success',text:`已在 ${((data.elapsed_ms||0)/1000).toFixed(1)} 秒讀取完成`})
 }catch(e:any){setFetchMessage({type:'error',text:`讀取失敗：${e?.message||'來源未提供公開資料'}。網址已保留，可手動填寫。`})}
 finally{setFetching(false)}
}

// input 改為：
// <input type="url" value={url} onChange={e=>queueAutoFetch(e.target.value)} onPaste={e=>queueAutoFetch(e.clipboardData.getData('text'))} required />
