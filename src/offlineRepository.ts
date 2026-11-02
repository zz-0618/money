import {db,tableOf} from './db'
import {enqueue,localDelete,localId,localPut,now,readSnapshot} from './localRepository'
import {flushQueue,pullAll} from './syncService'
import type {TableName} from './types'
export {readSnapshot}
export async function createLocal(userId:string,table:TableName,payload:any){const row=await localPut(table,{...payload,id:payload.id||localId(),user_id:userId});await enqueue({userId,table,action:'upsert',recordId:row.id,payload:strip(row)});if(navigator.onLine)void flushQueue(userId);return row}
export async function updateLocal(userId:string,table:TableName,id:string,patch:any){await tableOf(table).update(id,{...patch,updated_at:now(),_sync:'pending'});await enqueue({userId,table,action:'update',recordId:id,payload:patch,match:{id}});if(navigator.onLine)void flushQueue(userId)}
export async function deleteLocal(userId:string,table:TableName,id:string){await localDelete(table,id);await enqueue({userId,table,action:'delete',recordId:id,payload:null,match:{id}});if(navigator.onLine)void flushQueue(userId)}
export async function queueRpc(userId:string,name:string,payload:any,optimistic?:()=>Promise<void>){if(optimistic)await optimistic();await enqueue({userId,table:'rpc',action:'rpc',rpcName:name,payload});if(navigator.onLine)void flushQueue(userId)}
export async function refreshLocal(userId:string){await pullAll(userId);return readSnapshot(userId)}
export async function pendingCount(userId:string){return db.syncQueue.where('userId').equals(userId).count()}
function strip(row:any){const{_sync,_deleted,...value}=row;return value}
