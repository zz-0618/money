import Dexie,{Table} from 'dexie'
import type {LocalRow,SyncJob} from './types'
class MoneyDiaryDB extends Dexie{
  accounts!:Table<LocalRow,string>;transactions!:Table<LocalRow,string>;todos!:Table<LocalRow,string>;journal_entries!:Table<LocalRow,string>;user_categories!:Table<LocalRow,string>;user_settings!:Table<LocalRow,string>;balance_adjustments!:Table<LocalRow,string>;syncQueue!:Table<SyncJob,string>;meta!:Table<{key:string;value:any},string>
  constructor(){super('money-diary');this.version(1).stores({accounts:'id,user_id,sort_order,updated_at,_sync',transactions:'id,user_id,account_id,transfer_to_account_id,occurred_at,updated_at,_sync',todos:'id,user_id,due_at,updated_at,_sync',journal_entries:'id,user_id,entry_date,updated_at,_sync',user_categories:'id,user_id,scope,parent_id,sort_order,updated_at,_sync',user_settings:'user_id,updated_at,_sync',balance_adjustments:'id,user_id,account_id,created_at,_sync',syncQueue:'id,userId,table,action,createdAt',meta:'key'})}
}
export const db=new MoneyDiaryDB()
export const tableOf=(name:string)=>(db as any)[name] as Table<any,any>
