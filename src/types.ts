export type SyncState='synced'|'pending'|'failed'
export type TableName='accounts'|'transactions'|'todos'|'journal_entries'|'user_categories'|'user_settings'|'balance_adjustments'
export type MutationAction='insert'|'update'|'upsert'|'delete'|'rpc'
export interface LocalRow{id?:string;user_id?:string;updated_at?:string;_sync?:SyncState;_deleted?:boolean;_syncError?:string}
export interface SyncJob{id:string;userId:string;table:TableName|'rpc';action:MutationAction;recordId?:string;rpcName?:string;payload:any;match?:Record<string,unknown>;createdAt:string;attempts:number;lastError?:string}
export interface FlushResult{ok:boolean;processed:number;pending:number;error?:string}
export interface OfflineSnapshot{accounts:any[];transactions:any[];todos:any[];journal_entries:any[];user_categories:any[];user_settings:any[];balance_adjustments:any[]}
