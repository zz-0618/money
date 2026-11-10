import {FormEvent,useEffect,useMemo,useState} from 'react'
import {ArrowLeft,Folder,FolderPlus,Link as LinkIcon,ListOrdered,Pencil,Plus,Search,Trash2,X,GripVertical} from 'lucide-react'
import {supabase} from './supabase'
import './collections.css'

type FolderRow={id:string;name:string;sort_order:number;parent_id?:string|null}
type Article={id:string;folder_id?:string|null;platform:string;url:string;title?:string|null;body?:string|null;image_url?:string|null;image_urls?:string[]|null;created_at:string}
const platforms:any={facebook:['FB','#1877f2'],instagram:['IG','#e1306c'],threads:['THREADS','#777'],xiaohongshu:['小紅書','#ff2942'],douyin:['抖音','#25f4ee'],other:['連結','#888']}
// 免套件繁簡搜尋：兩組等長字串逐字對照，不載入 OpenCC。
const SEARCH_TRADITIONAL = '廈臺萬與專業東兩嚴個為麗舉麼義烏樂習鄉書買亂爭於虧雲亞產親僅從們價眾優會傳傷體餘兒黨蘭關興養獸內寫軍農決況凍淨涼減幾鳳憑凱擊劃劉則創刪別劇勸辦務動勵勞勢區醫華協單賣衛廳歷厲壓厭廣廠開異棄張彎強彈彙後徑徵恆惡惱愛慘慣慶憂懷態總戀戰戲戶損換據擇擋擔擬攏攔攝攜擺搖敗敘敵數鬥斷無舊時暈暫術機殺雜權條來極構槍櫃標棧棟樹樣橋檔檢樓歡歲歸殘氣漢湯溝滅滬滯濟濤濫濱灘灣燈靈災爐點煉煙煩燒熱爺牆牽獨獲獻環現畢畫當疊瘋發監盤盜盡礎禮禍種積稱穩穀窩競筆築範籃籌籤糧糾紀約紅紋納紐線練組細織終經綁結絕統絡給綠綜綱網維繳羅罰罷翹聖聞聯聰聲職聽肅脅脈腎腦腳脫臉臘膚膠膽臟艦艙藝節莊葉著蘿處虛蟲蝦蟻蠅蠟蠶補裝複襯襲見觀規覺覽覓視訓訊記講許論設訪證評識訴詞該詳語誤說請諸讀課誰調談謝譯議讓豔貝負財貢貧貨販貪責貴貸費貼貿賀賊賓賜賞賠賢賦質賬購贈贊趕趙跡踐車軌軟轉輪輯輸轄辭邊遼達遷過運還這進遠違連遲適選遺郵鄰醜釋裡鑑針釘鈔鈣鈴鉛銀銅銷鋒鋼錄錢錦鍋鍵鎖鐘鐵鑰長門閃閉問閒間閣隊陽陰陣階際陸險隨隱隻難雞離電霧靜頁頂頃項順須頓領頭頻題顏額風飛飯飲飽餓館馬馳駕驗騎騙魚魯鮮鳥鴨鵝麥黃齊齒龍龜遊'
const SEARCH_SIMPLIFIED = '厦台万与专业东两严个为丽举么义乌乐习乡书买乱争于亏云亚产亲仅从们价众优会传伤体余儿党兰关兴养兽内写军农决况冻净凉减几凤凭凯击划刘则创删别剧劝办务动励劳势区医华协单卖卫厅历厉压厌广厂开异弃张弯强弹汇后径征恒恶恼爱惨惯庆忧怀态总恋战戏户损换据择挡担拟拢拦摄携摆摇败叙敌数斗断无旧时晕暂术机杀杂权条来极构枪柜标栈栋树样桥档检楼欢岁归残气汉汤沟灭沪滞济涛滥滨滩湾灯灵灾炉点炼烟烦烧热爷墙牵独获献环现毕画当叠疯发监盘盗尽础礼祸种积称稳谷窝竞笔筑范篮筹签粮纠纪约红纹纳纽线练组细织终经绑结绝统络给绿综纲网维缴罗罚罢翘圣闻联聪声职听肃胁脉肾脑脚脱脸腊肤胶胆脏舰舱艺节庄叶着萝处虚虫虾蚁蝇蜡蚕补装复衬袭见观规觉览觅视训讯记讲许论设访证评识诉词该详语误说请诸读课谁调谈谢译议让艳贝负财贡贫货贩贪责贵贷费贴贸贺贼宾赐赏赔贤赋质账购赠赞赶赵迹践车轨软转轮辑输辖辞边辽达迁过运还这进远违连迟适选遗邮邻丑释里鉴针钉钞钙铃铅银铜销锋钢录钱锦锅键锁钟铁钥长门闪闭问闲间阁队阳阴阵阶际陆险随隐只难鸡离电雾静页顶顷项顺须顿领头频题颜额风飞饭饮饱饿馆马驰驾验骑骗鱼鲁鲜鸟鸭鹅麦黄齐齿龙龟游'
function normalizeSearch(value:string){
 const normalized=String(value||'').normalize('NFKC').toLocaleLowerCase('zh-TW')
 const extraMap:Record<string,string>={
  '蘋':'苹','苹':'苹',
  '臺':'台','颱':'台','檯':'台',
 }
 return Array.from(normalized).map(char=>{
  if(extraMap[char])return extraMap[char]
  const traditionalIndex=SEARCH_TRADITIONAL.indexOf(char)
  if(traditionalIndex>=0)return SEARCH_SIMPLIFIED[traditionalIndex]
  const simplifiedIndex=SEARCH_SIMPLIFIED.indexOf(char)
  if(simplifiedIndex>=0)return SEARCH_SIMPLIFIED[simplifiedIndex]
  return char
 }).join('').replace(/\s+/g,' ').trim()
}
function platformOf(url:string){const u=url.toLowerCase();if(u.includes('facebook.com')||u.includes('fb.com'))return'facebook';if(u.includes('instagram.com'))return'instagram';if(u.includes('threads.net')||u.includes('threads.com'))return'threads';if(u.includes('xiaohongshu.com')||u.includes('xhslink.com')||u.includes('rednote.com'))return'xiaohongshu';if(u.includes('douyin.com'))return'douyin';return'other'}
export default function CollectionsPage({user,done}:any){
 const[folders,setFolders]=useState<FolderRow[]>([]),[articles,setArticles]=useState<Article[]>([]),[currentFolder,setCurrentFolder]=useState<string|null>(null),[query,setQuery]=useState(''),[editing,setEditing]=useState<Article|null|undefined>(),[folderEditor,setFolderEditor]=useState<{row?:FolderRow|null;parentId?:string|null}|undefined>(),[sorting,setSorting]=useState(false),[dragging,setDragging]=useState('')
 async function load(){const[f,a]=await Promise.all([supabase.from('article_folders').select('*').order('sort_order'),supabase.from('saved_articles').select('*').order('created_at',{ascending:false})]);if(f.error)return done(f.error.message,false);if(a.error)return done(a.error.message,false);setFolders(f.data||[]);setArticles(a.data||[])}
 useEffect(()=>{load()},[])
 const active=folders.find(x=>x.id===currentFolder)||null,parent=active?.parent_id?folders.find(x=>x.id===active.parent_id)||null:null
 const levelFolders=folders.filter(x=>(x.parent_id||null)===(currentFolder||null)).sort((a,b)=>a.sort_order-b.sort_order)
 const rootFolders=folders.filter(x=>!x.parent_id).sort((a,b)=>a.sort_order-b.sort_order)
 const folderTree=useMemo(()=>{
  const childrenByParent=new Map<string,FolderRow[]>()
  for(const folder of folders){
   const parentKey=folder.parent_id||''
   const children=childrenByParent.get(parentKey)||[]
   children.push(folder)
   childrenByParent.set(parentKey,children)
  }
  return childrenByParent
 },[folders])

 function getDescendantFolderIds(folderId:string){
  const descendants=new Set<string>()
  const queue=[folderId]
  while(queue.length){
   const parentId=queue.shift()!
   for(const child of folderTree.get(parentId)||[]){
    if(!descendants.has(child.id)){
     descendants.add(child.id)
     queue.push(child.id)
    }
   }
  }
  return descendants
 }

 function getFolderStats(folderId:string){
  const includedFolderIds=getDescendantFolderIds(folderId)
  includedFolderIds.add(folderId)
  return{
   childFolderCount:includedFolderIds.size-1,
   articleCount:articles.reduce((total,article)=>
    article.folder_id&&includedFolderIds.has(article.folder_id)?total+1:total,0)
  }
 }

 const activeFolderIds=useMemo(()=>{
  if(!currentFolder)return null
  const ids=getDescendantFolderIds(currentFolder)
  ids.add(currentFolder)
  return ids
 },[currentFolder,folderTree])
 const normalizedQuery=useMemo(()=>normalizeSearch(query),[query])
 const shown=useMemo(()=>articles.filter(article=>{
  const inCurrentFolder=!activeFolderIds||(article.folder_id&&activeFolderIds.has(article.folder_id))
  if(!inCurrentFolder)return false
  if(!normalizedQuery)return true
  return normalizeSearch(`${article.title||''} ${article.body||''} ${article.url||''}`).includes(normalizedQuery)
 }),[articles,activeFolderIds,normalizedQuery])
 const displayedFolders=!active?rootFolders:levelFolders
 async function saveFolder(name:string,id?:string,parentId?:string|null){const{error}=await supabase.rpc('save_article_folder',{p_id:id||null,p_name:name,p_parent_id:parentId||null});if(error)return done(error.message,false);setFolderEditor(undefined);done('資料夾已儲存');load()}
 async function deleteFolder(x:FolderRow){if(!confirm(`確定刪除「${x.name}」？下層資料夾與文章會移到未分類。`))return;const{error}=await supabase.rpc('delete_article_folder',{p_id:x.id});if(error)return done(error.message,false);setCurrentFolder(x.parent_id||null);done('資料夾已刪除');load()}
 async function deleteArticle(x:Article){if(!confirm('確定刪除這篇收藏？'))return;const{error}=await supabase.rpc('delete_saved_article',{p_id:x.id});if(error)return done(error.message,false);done('收藏已刪除');load()}
 async function dropFolder(target:string){if(!dragging||dragging===target)return;const list=[...levelFolders],from=list.findIndex(x=>x.id===dragging),to=list.findIndex(x=>x.id===target);if(from<0||to<0)return;list.splice(to,0,list.splice(from,1)[0]);setDragging('');const{error}=await supabase.rpc('reorder_article_folders',{p_parent_id:currentFolder,p_ids:list.map(x=>x.id)});if(error)return done(error.message,false);setSorting(false);done('資料夾順序已更新');load()}
 const folderOptions=folders.map(f=>({id:f.id,label:f.parent_id?`${folders.find(p=>p.id===f.parent_id)?.name||''} / ${f.name}`:f.name}))
 return <><div className="collections-head"><div className="collections-search"><Search size={18}/><input placeholder="搜尋收藏" value={query} onChange={e=>setQuery(e.target.value)}/></div>{active&&<button className="iconbtn" title="新增子資料夾" onClick={()=>setFolderEditor({row:null,parentId:active.parent_id?active.parent_id:active.id})}><FolderPlus/></button>}<button className="iconbtn" title="排序資料夾" onClick={()=>setSorting(true)}><ListOrdered/></button>{!active&&<button className="iconbtn" title="新增母資料夾" onClick={()=>setFolderEditor({row:null,parentId:null})}><FolderPlus/></button>}</div>
 <div className="collection-breadcrumb">{active&&<button className="collection-back-icon" title={parent?`返回 ${parent.name}`:'返回全部收藏'} aria-label={parent?`返回 ${parent.name}`:'返回全部收藏'} onClick={()=>setCurrentFolder(active.parent_id||null)}><ArrowLeft size={19}/></button>}<div><h2>{active?.name||'全部收藏'}</h2><small>{active?(active.parent_id?'子資料夾':'母資料夾'):'所有收藏文章與母資料夾'}</small></div>{active&&<div className="collection-current-actions"><button className="collection-round-action" title="編輯資料夾" onClick={()=>setFolderEditor({row:active,parentId:active.parent_id||null})}><Pencil/></button><button className="collection-round-action collection-delete-action" title="刪除資料夾" onClick={()=>deleteFolder(active)}><Trash2/></button></div>}</div>
 <div className="collection-folders">{displayedFolders.map(folder=>{const stats=getFolderStats(folder.id);return <button className="collection-folder-card" onClick={()=>setCurrentFolder(folder.id)} key={folder.id}><span className="collection-folder-icon"><Folder/></span><span className="collection-folder-copy"><strong>{folder.name}</strong><small>{folder.parent_id?`${stats.articleCount} 篇文章`:`${stats.childFolderCount} 個子資料夾・${stats.articleCount} 篇文章`}</small></span></button>})}</div>
 <section className="collection-grid">{shown.map(x=>{const[label,color]=platforms[x.platform]||platforms.other;return <article className="saved-article" key={x.id}>{x.image_url?<img src={x.image_url} alt=""/>:<div className="saved-article-placeholder"><LinkIcon/></div>}<div className="saved-article-copy"><div className="article-platform" style={{color}}>{label}</div><h2>{x.title||'未取得文章標題'}</h2>{x.body?<p>{x.body}</p>:<p className="empty-body">文章內文空白</p>}<div className="saved-article-actions"><a href={x.url} target="_blank" rel="noreferrer">開啟原文</a><button className="collection-round-action" title="編輯收藏" onClick={()=>setEditing(x)}><Pencil/></button><button className="collection-round-action collection-delete-action" title="刪除收藏" onClick={()=>deleteArticle(x)}><Trash2/></button></div></div></article>})}</section>{!shown.length&&<section className="panel empty">目前沒有收藏文章</section>}<button className="floating-add" onClick={()=>setEditing(null)}><Plus/></button>
 {editing!==undefined&&<ArticleEditor row={editing} folders={folderOptions} defaultFolder={currentFolder} done={done} close={()=>setEditing(undefined)} reload={load}/>} {folderEditor!==undefined&&<FolderEditor row={folderEditor.row} parentId={folderEditor.parentId} close={()=>setFolderEditor(undefined)} save={saveFolder}/>} {sorting&&<SortFolders title={active?'子資料夾排序':'母資料夾排序'} rows={levelFolders} dragging={dragging} setDragging={setDragging} drop={dropFolder} close={()=>setSorting(false)}/>}</>
}
function SortFolders({title,rows,dragging,setDragging,drop,close}:any){return <div className="modal"><div className="panel collection-modal collection-sort-modal"><button className="modal-close" onClick={close}><X/></button><h2>{title}</h2>{rows.length?<div className="collection-sort-list">{rows.map((x:FolderRow)=><div draggable onDragStart={()=>setDragging(x.id)} onDragOver={(e:any)=>e.preventDefault()} onDrop={()=>drop(x.id)} className={dragging===x.id?'dragging':''} key={x.id}><GripVertical/><span>{x.name}</span></div>)}</div>:<p className="empty">目前沒有可排序的資料夾</p>}</div></div>}
function FolderEditor({row,parentId,close,save}:any){const[name,setName]=useState(row?.name||'');return <div className="modal"><form className="panel collection-modal" onSubmit={e=>{e.preventDefault();if(name.trim())save(name.trim(),row?.id,parentId)}}><button type="button" className="modal-close" onClick={close}><X/></button><h2>{row?'編輯資料夾':parentId?'新增子資料夾':'新增母資料夾'}</h2><label>資料夾名稱<input value={name} onChange={e=>setName(e.target.value)} required autoFocus/></label><button>儲存</button></form></div>}
function ArticleEditor({row,folders,defaultFolder,done,close,reload}:any){const[url,setUrl]=useState(row?.url||''),[platform,setPlatform]=useState(row?.platform||'other'),[folder,setFolder]=useState(row?.folder_id||defaultFolder||''),[title,setTitle]=useState(row?.title||''),[body,setBody]=useState(row?.body||''),[image,setImage]=useState(row?.image_url||''),[images,setImages]=useState<string[]>(row?.image_urls||[]),[fetching,setFetching]=useState(false),[fetchMessage,setFetchMessage]=useState<{type:'success'|'error';text:string}|null>(null)
 async function fetchMeta(){
  const inputUrl=url.trim()
  if(!inputUrl){setFetchMessage({type:'error',text:'請先貼上文章連結'});return}
  setFetching(true);setFetchMessage(null)
  try{
   const detected=platformOf(inputUrl);setPlatform(detected)
   const invocation=supabase.functions.invoke('article-link-preview',{body:{url:inputUrl,platform:detected,resolve_short_url:true}})
   const timeout=new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('讀取逾時（45 秒）。小紅書解析服務沒有在時間內回應，請稍後重試。')),45000))
   const{data,error}=await Promise.race([invocation,timeout])
   if(error){
    let detail=error.message||'Edge Function 呼叫失敗'
    try{const context=(error as any)?.context;if(context instanceof Response){const payload=await context.clone().json();detail=payload?.error||payload?.message||detail}}catch{}
    throw new Error(detail)
   }
   if(!data||typeof data!=='object')throw new Error('Edge Function 沒有回傳 JSON 資料')
   if(data.ok===false||data.error)throw new Error(String(data.error||'文章資料讀取失敗'))
   const returnedPlatform=String(data.platform||detected)
   const rawTitle=String(data.title||'').trim(),rawBody=String(data.body||'').trim()
   const douyinNoise=/于?20\d{6,8}发布在抖音|已经收获了?\d+个喜欢|来抖音[，, ]?记录美好生活/i
   const cleanDouyin=(value:string)=>value.replace(/^于?20\d{6,8}发布在抖音[，, ]*/,'').replace(/[，, ]*已经收获了?\d+个喜欢[，, ]*/g,'，').replace(/[，, ]*来抖音[，, ]?记录美好生活[！!。. ]*$/,'').trim()
   const nextTitle=returnedPlatform==='douyin'&&douyinNoise.test(rawTitle)?cleanDouyin(rawTitle):rawTitle
   const nextBody=returnedPlatform==='douyin'&&douyinNoise.test(rawBody)?cleanDouyin(rawBody):rawBody
   const candidateImages=[data.image_url,data.thumbnail_url,data.cover_url,data.poster,...(Array.isArray(data.image_urls)?data.image_urls:[])].filter((v:any,i:number,a:any[])=>typeof v==='string'&&/^https?:\/\//i.test(v)&&a.indexOf(v)===i)
   const missing=[!nextTitle?'標題':'',!nextBody?'內容':'',!candidateImages.length?'影片縮圖':''].filter(Boolean)
   if(returnedPlatform==='douyin'&&missing.length)throw new Error(`抖音作品資料不完整，缺少：${missing.join('、')}`)
   const xhsNoise=/登入\s*-\s*rednote|login\s*-\s*rednote|share,\s*connect,\s*love|來小紅書[，, ]*與全世界最有趣的人做朋友|登录\s*-\s*小红书/i
   if(returnedPlatform==='xiaohongshu'||detected==='xiaohongshu'){
    const xhsMissing=[!nextTitle||xhsNoise.test(nextTitle)?'標題':'',!nextBody||xhsNoise.test(nextBody)?'內文':'',!candidateImages.length?'圖片':''].filter(Boolean)
    if(xhsMissing.length)throw new Error(`小紅書貼文資料不完整，缺少：${xhsMissing.join('、')}`)
   }
   if(!nextTitle&&!nextBody&&!candidateImages.length)throw new Error('來源沒有回傳可用的標題、內容或圖片')
   setTitle(nextTitle);setBody(nextBody);setImages(candidateImages);setImage(candidateImages[0]||'')
   if(data.resolved_url||data.url)setUrl(String(data.resolved_url||data.url));setPlatform(returnedPlatform)
   const text=returnedPlatform==='douyin'?'抖音作品資料已完整讀取':returnedPlatform==='xiaohongshu'?'小紅書貼文資料已完整讀取':'文章資料已讀取'
   setFetchMessage({type:'success',text});done(text,false)
  }catch(error:any){
   const text=`讀取失敗：${error?.message||'來源網站未提供可讀取資料'}。連結已保留，可手動填寫。`
   setFetchMessage({type:'error',text});done(text,false)
  }finally{setFetching(false)}
 }
 async function save(e:FormEvent){e.preventDefault();const{error}=await supabase.rpc('save_saved_article',{p_id:row?.id||null,p_folder_id:folder||null,p_platform:platformOf(url)||platform,p_url:url.trim(),p_title:title.trim()||null,p_body:body.trim()||null,p_image_url:image.trim()||null,p_image_urls:images.length?images:(image.trim()?[image.trim()]:[])});if(error)return done(error.message,false);close();done(row?'收藏已更新':'文章已收藏');reload()}
 return <div className="modal collection-editor-overlay"><form className="panel collection-modal collection-article-editor" onSubmit={save}><button type="button" className="modal-close" onClick={close}><X/></button><h2>{row?'編輯收藏':'收藏文章'}</h2><label>文章連結<div className="collection-url"><input type="url" value={url} onChange={e=>{setUrl(e.target.value);setPlatform(platformOf(e.target.value))}} required/><button type="button" disabled={fetching} onClick={fetchMeta}>{fetching?'讀取中':'讀取'}</button></div></label>{fetchMessage&&<div className={'collection-fetch-message '+fetchMessage.type} role="status" aria-live="polite">{fetchMessage.text}</div>}<label>資料夾<select value={folder} onChange={e=>setFolder(e.target.value)}><option value="">未分類</option>{folders.map((f:any)=><option value={f.id} key={f.id}>{f.label}</option>)}</select></label><label>文章標題<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label>文章圖片網址<input type="url" value={image} onChange={e=>setImage(e.target.value)}/></label><label>文章內文<textarea value={body} onChange={e=>setBody(e.target.value)}/></label>{(images.length||image)&&<div className="collection-image-gallery">{(images.length?images:[image]).map((src:string,i:number)=><img className="collection-image-preview" src={src} alt={`預覽 ${i+1}`} key={src+i}/>)}</div>}<button>儲存收藏</button></form></div>}
