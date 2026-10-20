import { FormEvent, useEffect, useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Plus,
  WalletCards,
} from 'lucide-react'
import { supabase } from './supabase'
import type { Account, Journal, Todo, Tx } from './types'
const money=(n:number,c='TWD')=>new Intl.NumberFormat('zh-TW',{style:'currency',currency:c,maximumFractionDigits:0}).format(n||0);const today=()=>new Date().toISOString().slice(0,10);
export default function App(){const[user,setUser]=useState<any>();const[view,setView]=useState('home');const[accounts,setAccounts]=useState<Account[]>([]);const[txs,setTxs]=useState<Tx[]>([]);const[todos,setTodos]=useState<Todo[]>([]);const[journals,setJournals]=useState<Journal[]>([]);const[msg,setMsg]=useState('');
useEffect(()=>{supabase.auth.getSession().then(x=>setUser(x.data.session?.user));const{data}=supabase.auth.onAuthStateChange((_e,s)=>setUser(s?.user));return()=>data.subscription.unsubscribe()},[]);
const load=async()=>{if(!user)return;const[a,t,d,j]=await Promise.all([supabase.from('accounts').select('*').order('created_at'),supabase.from('transactions').select('*').order('occurred_at',{ascending:false}),supabase.from('todos').select('*').order('due_at'),supabase.from('journal_entries').select('*').order('entry_date',{ascending:false})]);setAccounts(a.data||[]);setTxs(t.data||[]);setTodos(d.data||[]);setJournals(j.data||[])};
useEffect(()=>{if(!user)return;load();const channel=supabase.channel('wealthlife-sync').on('postgres_changes',{event:'*',schema:'public'},load).subscribe();return()=>{supabase.removeChannel(channel)}},[user]);
if(!user)return <Auth/>;
const income=txs.filter(x=>x.kind==='income').reduce((s,x)=>s+Number(x.amount),0),expense=txs.filter(x=>x.kind==='expense').reduce((s,x)=>s+Number(x.amount),0),net=accounts.reduce((s,a)=>s+(a.kind==='liability'?-1:1)*Number(a.balance),0);
return <div className="shell"><aside><div className="brand"><CircleDollarSign/>財日記</div>{[['home',LayoutDashboard,'總覽'],['ledger',WalletCards,'記帳'],['todo',CheckCircle2,'待辦'],['journal',BookOpen,'日記']].map(([id,Icon,label]:any)=><button className={view===id?'active':''} onClick={()=>setView(id)} key={id}><Icon size={19}/>{label}</button>)}<button className="logout" onClick={()=>supabase.auth.signOut()}><LogOut size={18}/>登出</button></aside><main><header><div><small>跨裝置同步</small><h1>{({home:'財務總覽',ledger:'記帳',todo:'待辦',journal:'日記'}as any)[view]}</h1></div><span className="status">● 已連線</span></header>{msg&&<div className="toast">{msg}</div>}{view==='home'&&<Home net={net} income={income} expense={expense} accounts={accounts}/>} {view==='ledger'&&<Ledger user={user} accounts={accounts} txs={txs} done={(m: string) => { setMsg(m); load() }}/>}{view==='todo'&&<Todos user={user} items={todos} done={load}/>} {view==='journal'&&<JournalPage user={user} items={journals} done={load}/>}</main></div>}
function Auth(){
  const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[info,setInfo]=useState('');

  async function login(e:FormEvent){
    e.preventDefault();
    const cleanEmail=email.trim();
    if(!cleanEmail){setInfo('請輸入 Email');return}
    if(!password){setInfo('請輸入密碼');return}
    const{error}=await supabase.auth.signInWithPassword({email:cleanEmail,password});
    setInfo(error?.message||'登入成功');
  }

  async function signup(){
    const cleanEmail=email.trim();
    if(!cleanEmail){setInfo('請輸入 Email');return}
    if(!password){setInfo('請輸入密碼');return}
    if(password.length<8){setInfo('密碼至少需要 8 個字元');return}
    const{error}=await supabase.auth.signUp({email:cleanEmail,password});
    setInfo(error?.message||'註冊完成，請至 Email 完成驗證');
  }

  return <div className="auth"><form onSubmit={login}><CircleDollarSign size={42}/><h1>財日記</h1><p>與 iPhone 共用同一個 Supabase 帳號</p><input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/><input type="password" placeholder="密碼（至少 8 字元）" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required/><button type="submit">登入</button><button type="button" className="secondary" onClick={signup}>建立帳號</button><small>{info}</small></form></div>
}
function Home({net,income,expense,accounts}:any){return <><section className="hero"><span>我的淨資產</span><strong>{money(net)}</strong></section><div className="cards"><Card t="本月收入" v={money(income)} c="green"/><Card t="本月支出" v={money(expense)} c="orange"/><Card t="資產" v={money(accounts.filter((a:Account)=>a.kind!=='liability').reduce((s:number,a:Account)=>s+Number(a.balance),0))} c="blue"/><Card t="負債" v={money(accounts.filter((a:Account)=>a.kind==='liability').reduce((s:number,a:Account)=>s+Number(a.balance),0))} c="pink"/></div><section className="panel"><h2>帳戶與資產比例</h2>{accounts.map((a:Account)=><div className="row" key={a.id}><span>{a.name}<small>{a.kind}・{a.currency}</small></span><b>{money(Number(a.balance),a.currency)}</b></div>)}</section></>};function Card(p:any){return <section className={'card '+p.c}><span>{p.t}</span><b>{p.v}</b></section>}
function Ledger({user,accounts,txs,done}:any){const[kind,setKind]=useState('expense'),[amount,setAmount]=useState(''),[account,setAccount]=useState(accounts[0]?.id||''),[note,setNote]=useState(''),[currency,setCurrency]=useState('TWD');useEffect(()=>{if(!account&&accounts[0])setAccount(accounts[0].id)},[accounts]);async function add(e:FormEvent){e.preventDefault();const{error}=await supabase.from('transactions').insert({user_id:user.id,kind,amount:Number(amount),currency,account_id:account,note,is_reimbursable:false,is_advance:false});done(error?error.message:'記錄已同步');setAmount('');setNote('')}return <div className="twocol"><form className="panel" onSubmit={add}><h2><Plus size={18}/>新增收支</h2><div className="seg">{['expense','income','transfer'].map(x=><button type="button" className={kind===x?'on':''} onClick={()=>setKind(x)}>{({expense:'支出',income:'收入',transfer:'轉帳'}as any)[x]}</button>)}</div><input type="number" step="0.01" placeholder="金額" value={amount} onChange={e=>setAmount(e.target.value)} required/><select value={currency} onChange={e=>setCurrency(e.target.value)}>{['TWD','USD','JPY','KRW','EUR'].map(x=><option>{x}</option>)}</select><select value={account} onChange={e=>setAccount(e.target.value)} required>{accounts.map((a:Account)=><option value={a.id}>{a.name}</option>)}</select><input placeholder="備註" value={note} onChange={e=>setNote(e.target.value)}/><button>儲存並同步</button></form><section className="panel"><h2>最近記錄</h2>{txs.map((x:Tx)=><div className="row" key={x.id}><span>{x.note||({expense:'支出',income:'收入',transfer:'轉帳'}as any)[x.kind]}<small>{new Date(x.occurred_at).toLocaleString('zh-TW')}</small></span><b className={x.kind}>{x.kind==='expense'?'-':'+'}{money(Number(x.amount),x.currency)}</b></div>)}</section></div>}
function Todos({user,items,done}:any){const[title,setTitle]=useState(''),[date,setDate]=useState(today()),[location,setLocation]=useState('');async function add(e:FormEvent){e.preventDefault();await supabase.from('todos').insert({user_id:user.id,title,due_at:new Date(date+'T09:00:00').toISOString(),remind_before_minutes:30,location_name:location,note:'',is_done:false});setTitle('');done()}async function toggle(x:Todo){await supabase.from('todos').update({is_done:!x.is_done}).eq('id',x.id);done()}return <div className="twocol"><form className="panel" onSubmit={add}><h2>新增待辦</h2><input placeholder="待辦事項" value={title} onChange={e=>setTitle(e.target.value)} required/><input type="date" value={date} onChange={e=>setDate(e.target.value)}/><input placeholder="地點" value={location} onChange={e=>setLocation(e.target.value)}/><button>加入</button></form><section className="panel"><h2>待辦清單</h2>{items.map((x:Todo)=><button className="todo" onClick={()=>toggle(x)}><span>{x.is_done?'✓':'○'}</span><div>{x.title}<small>{new Date(x.due_at).toLocaleString('zh-TW')} {x.location_name&&'・'+x.location_name}</small></div></button>)}</section></div>}
function JournalPage({user,items,done}:any){const[mood,setMood]=useState('😊'),[body,setBody]=useState(''),[date,setDate]=useState(today()),[file,setFile]=useState<File>();async function save(e:FormEvent){e.preventDefault();let path:string|undefined;if(file){path=`${user.id}/${date}/${crypto.randomUUID()}-${file.name}`;const u=await supabase.storage.from('journal-images').upload(path,file);if(u.error)return alert(u.error.message)}await supabase.from('journal_entries').upsert({user_id:user.id,entry_date:date,mood,body,image_paths:path?[path]:[],cover_path:path},{onConflict:'user_id,entry_date'});setBody('');done()}return <><form className="panel journal" onSubmit={save}><h2>寫下今天</h2><input type="date" value={date} onChange={e=>setDate(e.target.value)}/><div className="moods">{['😍','😊','😐','😮‍💨','😢'].map(x=><button type="button" className={mood===x?'on':''} onClick={()=>setMood(x)}>{x}</button>)}</div><textarea placeholder="今天發生了什麼？" value={body} onChange={e=>setBody(e.target.value)}/><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0])}/><button>儲存日記</button></form><section className="panel"><h2>Monthly Dump</h2><div className="dump">{items.map((x:Journal)=><article><b>{new Date(x.entry_date+'T00:00:00').getDate()}</b><span>{x.mood}</span><small>{x.body.slice(0,28)}</small></article>)}</div></section></>}
