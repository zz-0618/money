import{db,tableOf}from'./db'
import{enqueue,localDelete,localId,localPut,readSnapshot}from'./localRepository'
import{flushQueue,pullAll}from'./syncService'
import type{TableName}from'./types'
export{readSnapshot}
export async function createLocal(userId:string,table:TableName,payload:any){const row=await localPut(table,{...payload,id:payload.id||localId(),user_id:userId});await enqueue({userId,table,action:'upsert',recordId:row.id,payload:strip(row)});const sync=navigator.onLine?await flushQueue(userId):{ok:false,pending:1,error:'目前離線'};return{...row,_sync:sync.ok?'synced':sync.error==='目前離線'?'pending':'failed',_syncError:sync.error}}
export async function updateLocal(userId:string,table:TableName,id:string,patch:any){const current=await tableOf(table).get(id);const localRow={...(current||{}),...patch,id,user_id:current?.user_id||userId,_sync:'pending',_deleted:false,_syncError:undefined};await tableOf(table).put(localRow);await enqueue({userId,table,action:'update',recordId:id,payload:patch,match:{id,user_id:userId}});const sync=navigator.onLine?await flushQueue(userId):{ok:false,pending:1,error:'目前離線'};return{...localRow,_sync:sync.ok?'synced':sync.error==='目前離線'?'pending':'failed',_syncError:sync.error}}
export async function deleteLocal(userId:string,table:TableName,id:string){await localDelete(table,id);await enqueue({userId,table,action:'delete',recordId:id,payload:null,match:{id,user_id:userId}});return navigator.onLine?flushQueue(userId):{ok:false,pending:1,error:'目前離線'}}
export async function retrySync(userId:string){return flushQueue(userId)}
export async function queueRpc(userId:string,name:string,payload:any,optimistic?:()=>Promise<void>){if(optimistic)await optimistic();await enqueue({userId,table:'rpc',action:'rpc',rpcName:name,payload});return navigator.onLine?flushQueue(userId):{ok:false,pending:1,error:'目前離線'}}
export async function refreshLocal(userId:string){await pullAll(userId);return readSnapshot(userId)}
export async function pendingCount(userId:string){return db.syncQueue.where('userId').equals(userId).count()}
function strip(row:any){const{_sync,_deleted,_syncError,...value}=row;return value}
