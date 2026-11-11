// src/articlePreview.ts
import { supabase } from './supabase'
export type ArticlePreview={ok:boolean;platform:string;url:string;resolved_url?:string;title?:string;body?:string;image_url?:string;image_urls?:string[];error?:string;elapsed_ms?:number}
export async function getArticlePreview(url:string,timeoutMs=9500):Promise<ArticlePreview>{
 const controller=new AbortController();const timer=window.setTimeout(()=>controller.abort(),timeoutMs)
 try{
  const {data,error}=await supabase.functions.invoke('article-link-preview',{body:{url},signal:controller.signal})
  if(error){let detail=error.message;try{const r=(error as any).context;if(r instanceof Response){const j=await r.clone().json();detail=j.error||j.message||detail}}catch{}throw new Error(detail)}
  if(!data?.ok)throw new Error(data?.error||'未取得文章資料')
  return data
 }catch(e:any){if(e?.name==='AbortError')throw new Error('超過 10 秒仍未完成，請再試一次或手動輸入');throw e}
 finally{window.clearTimeout(timer)}
}
