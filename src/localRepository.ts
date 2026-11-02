import {db,tableOf} from './db'
import type {OfflineSnapshot,SyncJob,TableName} from './types'
const TABLES:TableName[]=['accounts','transactions','todos','journal_entries','user_categories','user_settings','balance_adjustments']
export const now=()=>new Date().toISOString()
export function localId(){return crypto.randomUUID()}
export async function readSnapshot(userId:string):Promise<OfflineSnapshot>{const out:any={};await Promise.all(TABLES.map(async n=>{const rows=await tableOf(n).where('user_id').equals(userId).toArray().catch(()=>tableOf(n).toArray());out[n]=rows.filter((x:any)=>!x._deleted)}));return out}
export async function replaceFromCloud(table:TableName,userId:string,rows:any[]){await db.transaction('rw',tableOf(table),async()=>{const pending=await tableOf(table).filter((x:any)=>x.user_id===userId&&x._sync==='pending').toArray();const pendingIds=new Set(pending.map((x:any)=>x.id));const cloud=rows.filter(x=>!pendingIds.has(x.id)).map(x=>({...x,_sync:'synced',_deleted:false}));await tableOf(table).bulkPut(cloud);const cloudIds=new Set(rows.map(x=>x.id));const stale=await tableOf(table).filter((x:any)=>x.user_id===userId&&x._sync!=='pending'&&x.id&&!cloudIds.has(x.id)).primaryKeys();if(stale.length)await tableOf(table).bulkDelete(stale as any)})}
export async function enqueue(job:Omit<SyncJob,'id'|'createdAt'|'attempts'>){await db.syncQueue.put({...job,id:localId(),createdAt:now(),attempts:0})}
export async function localPut(table:TableName,row:any){const value={...row,id:row.id||localId(),updated_at:row.updated_at||now(),_sync:'pending',_deleted:false};await tableOf(table).put(value);return value}
export async function localDelete(table:TableName,id:string){await tableOf(table).update(id,{_deleted:true,_sync:'pending',updated_at:now()})}
