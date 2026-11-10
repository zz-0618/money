import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Check,
  ExternalLink,
  Pencil,
  Plus,
  Quote,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { supabase } from './supabase'
import './books.css'

type BookStatus = 'want' | 'reading' | 'finished'
type ResultKind = 'work' | 'edition'

type ApiBookResult = {
  kind?: ResultKind
  source?: string
  source_id?: string
  title?: string
  author?: string | null
  isbn?: string | null
  publisher?: string | null
  publication_date?: string | null
  cover_url?: string | null
  image_url?: string | null
  description?: string | null
  source_url?: string | null
  work_type?: 'book' | 'web_novel'
  origin_region?: string | null
  source_platform?: string | null
  metadata?: Record<string, unknown>
}

type BookResult = {
  source: string
  source_id: string
  title: string
  isbn: string | null
  image_url: string
  author: string
  publisher: string
  description: string
  source_url: string
  kind?: ResultKind
  work_type?: 'book' | 'web_novel'
  origin_region?: string
  source_platform?: string
  publication_date?: string
}

type BookRow = BookResult & {
  id: string
  user_id: string
  status: BookStatus
  rating?: number | null
  review?: string | null
  quotes?: string[] | null
  created_at?: string
}

type SourceStatus = {
  source: string
  ok: boolean
  count: number
  error?: string | null
}

const STATUS: [BookStatus, string][] = [
  ['want', '待看'],
  ['reading', '正在看'],
  ['finished', '已看'],
]

const label = (status: BookStatus) =>
  STATUS.find(item => item[0] === status)?.[1] || status

const text = (value: unknown) => String(value ?? '').trim()

function normalizeResult(item: ApiBookResult, index: number): BookResult | null {
  const title = text(item?.title)
  if (!title) return null

  const source = text(item?.source_platform || item?.source || 'unknown')
  const sourceId = text(item?.source_id) || `${source}-${index}-${title}`
  const isWebNovel = item?.work_type === 'web_novel' || source === 'jjwxc'

  return {
    source,
    source_id: sourceId,
    title,
    isbn: text(item?.isbn) || null,
    image_url: text(item?.cover_url || item?.image_url),
    author: text(item?.author),
    publisher: text(item?.publisher),
    description: text(item?.description),
    source_url: text(item?.source_url),
    kind: item?.kind || (isWebNovel ? 'work' : 'edition'),
    work_type: isWebNovel ? 'web_novel' : 'book',
    origin_region: text(item?.origin_region),
    source_platform: source,
    publication_date: text(item?.publication_date),
  }
}

function sourceLabel(book: BookResult) {
  if (book.work_type === 'web_novel' || book.source === 'jjwxc') {
    return '晉江文學城・網路小說'
  }
  if (book.source === 'local') return book.kind === 'work' ? '本地作品' : '本地版本'
  if (book.source === 'google_books') return 'Google Books'
  if (book.source === 'open_library') return 'Open Library'
  if (book.source === 'isbndb') return 'ISBNdb'
  if (book.source === 'manual') return '手動輸入'
  return book.isbn ? `ISBN ${book.isbn}` : '書籍資料'
}

function sourceStatusText(statuses: SourceStatus[]) {
  return statuses
    .map(item =>
      item.ok
        ? `${item.source}：${item.count} 筆結果`
        : `${item.source}：失敗${item.error ? ` ${item.error}` : ''}`,
    )
    .join('；')
}

function manualBook(title: string): BookResult {
  return {
    source: 'manual',
    source_id: `manual-${Date.now()}`,
    title: title.trim(),
    isbn: null,
    image_url: '',
    author: '',
    publisher: '',
    description: '',
    source_url: '',
    kind: 'work',
    work_type: 'book',
    origin_region: '',
    source_platform: 'manual',
    publication_date: '',
  }
}

export default function BooksPage({ user, done }: any) {
  const [books, setBooks] = useState<BookRow[]>([])
  const [filter, setFilter] = useState<'all' | BookStatus>('all')
  const [editor, setEditor] = useState<BookRow | null | undefined>()
  const [detail, setDetail] = useState<BookRow | null>(null)

  async function load() {
    const { data, error } = await supabase
      .from('bookshelf_items')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return done(error.message, false)
    setBooks((data || []) as BookRow[])
  }

  useEffect(() => {
    load()
  }, [])

  const visible = useMemo(
    () => books.filter(book => filter === 'all' || book.status === filter),
    [books, filter],
  )

  async function remove(id: string) {
    if (!confirm('確定刪除這本書？')) return

    const { error } = await supabase.from('bookshelf_items').delete().eq('id', id)
    if (error) return done(error.message, false)

    setDetail(null)
    await load()
    done('書籍已刪除', false)
  }

  return (
    <>
      <div className="books-status-tabs">
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
          全部 <small>{books.length}</small>
        </button>
        {STATUS.map(([id, name]) => (
          <button className={filter === id ? 'on' : ''} onClick={() => setFilter(id)} key={id}>
            {name}<small>{books.filter(book => book.status === id).length}</small>
          </button>
        ))}
      </div>

      <section className="books-grid">
        {visible.map(book => (
          <button className="book-card" onClick={() => setDetail(book)} key={book.id}>
            {book.image_url ? (
              <img src={book.image_url} alt="" loading="lazy" />
            ) : (
              <span className="book-cover-empty"><BookOpen /></span>
            )}
            <span>
              <b>{book.title}</b>
              <small>{book.author || '作者未提供'}</small>
              <em className={book.status}>{label(book.status)}</em>
              {book.rating ? <strong><Star size={15} />{book.rating}</strong> : null}
            </span>
          </button>
        ))}
      </section>

      {!visible.length && <p className="empty">尚無書籍</p>}
      <button className="floating-add" onClick={() => setEditor(null)}><Plus /></button>

      {editor !== undefined && (
        <BookEditor
          user={user}
          row={editor}
          done={done}
          reload={load}
          close={() => setEditor(undefined)}
        />
      )}

      {detail && (
        <div className="modal">
          <article className="panel book-detail">
            <button className="modal-close" onClick={() => setDetail(null)}><X /></button>
            <button className="book-detail-edit" onClick={() => { setEditor(detail); setDetail(null) }}>
              <Pencil />
            </button>
            <div className="book-detail-top">
              {detail.image_url ? (
                <img src={detail.image_url} alt="" />
              ) : (
                <span className="book-cover-empty"><BookOpen /></span>
              )}
              <div>
                <small>{detail.source === 'jjwxc' ? '晉江網路小說' : '出版書籍'}</small>
                <h2>{detail.title}</h2>
                <p>{detail.author}</p>
                {detail.publisher && <p>{detail.publisher}</p>}
                {detail.isbn && <p>ISBN：{detail.isbn}</p>}
                <em className={detail.status}>{label(detail.status)}</em>
                {detail.rating ? <strong><Star size={16} />{detail.rating}</strong> : null}
              </div>
            </div>
            {detail.description && <section><h3>簡介</h3><p>{detail.description}</p></section>}
            {detail.review && <section><h3>心得</h3><p>{detail.review}</p></section>}
            {detail.quotes?.length ? (
              <section>
                <h3>佳句</h3>
                {detail.quotes.map((quote, index) => (
                  <blockquote key={index}><Quote size={17} />{quote}</blockquote>
                ))}
              </section>
            ) : null}
            {detail.source_url && (
              <a href={detail.source_url} target="_blank" rel="noreferrer">
                <ExternalLink size={17} />開啟來源
              </a>
            )}
            <button className="delete-full" onClick={() => remove(detail.id)}>
              <Trash2 size={17} />刪除書籍
            </button>
          </article>
        </div>
      )}
    </>
  )
}

function BookEditor({ user, row, done, reload, close }: any) {
  const [query, setQuery] = useState(row?.title || '')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<BookResult[]>([])
  const [picked, setPicked] = useState<BookResult | null>(row || null)
  const [manual, setManual] = useState(false)
  const [status, setStatus] = useState<BookStatus>(row?.status || 'want')
  const [rating, setRating] = useState(String(row?.rating || ''))
  const [review, setReview] = useState(row?.review || '')
  const [quotesText, setQuotesText] = useState((row?.quotes || []).join('\n'))

  async function search() {
    const keyword = query.trim()
    if (!keyword) return

    setSearching(true)
    setManual(false)
    setPicked(null)
    setResults([])

    try {
      const { data, error } = await supabase.functions.invoke('book-search', {
        body: { action: 'search', query: keyword },
      })

      if (error) throw error
      if (data?.error && data?.ok === false) throw new Error(data.error)

      const rawResults: ApiBookResult[] = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.books)
          ? data.books
          : []

      const normalized = rawResults
        .map((item, index) => normalizeResult(item, index))
        .filter((item): item is BookResult => item !== null)

      setResults(normalized)

      const statuses: SourceStatus[] = Array.isArray(data?.source_status)
        ? data.source_status
        : []
      const summary = sourceStatusText(statuses)

      if (normalized.length > 0) {
        done(`找到 ${normalized.length} 筆可選資料。${summary}`, false)
        return
      }

      setManual(true)
      setPicked(manualBook(keyword))
      done(`找不到符合條件的自動資料，已切換為手動輸入。${summary}`, false)
    } catch (error: any) {
      done(`書籍搜尋失敗：${error?.message || String(error)}`, false)
    } finally {
      setSearching(false)
    }
  }

  function selectResult(book: BookResult) {
    setPicked(book)
    setQuery(book.title)
    setResults([])
    setManual(false)
  }

  async function cacheSelected(book: BookResult) {
    if (book.source === 'manual' || book.source === 'local') return

    const cacheItem = {
      kind: book.kind || (book.work_type === 'web_novel' ? 'work' : 'edition'),
      source: book.source,
      source_id: book.source_id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      publisher: book.publisher,
      publication_date: book.publication_date || '',
      cover_url: book.image_url,
      description: book.description,
      source_url: book.source_url,
      work_type: book.work_type || 'book',
      origin_region: book.origin_region || '',
      source_platform: book.source_platform || book.source,
    }

    const { data, error } = await supabase.functions.invoke('book-search', {
      body: { action: 'cache', item: cacheItem },
    })

    if (error) throw error
    if (data?.error && data?.ok === false) throw new Error(data.error)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!picked) return done('請先搜尋並選擇書籍', false)
    if (!picked.title.trim()) return done('請輸入書名', false)

    try {
      await cacheSelected(picked)

      const payload = {
        user_id: user.id,
        source: picked.source,
        source_id: picked.source_id,
        title: picked.title.trim(),
        isbn: picked.isbn || null,
        image_url: picked.image_url || null,
        author: picked.author || null,
        publisher: picked.publisher || null,
        description: picked.description || null,
        source_url: picked.source_url || null,
        status,
        rating: status !== 'want' && rating ? Number(rating) : null,
        review: status !== 'want' ? review.trim() || null : null,
        quotes: status !== 'want'
          ? quotesText.split('\n').map((value: string) => value.trim()).filter(Boolean)
          : [],
        updated_at: new Date().toISOString(),
      }

      const request = row?.id
        ? supabase.from('bookshelf_items').update(payload).eq('id', row.id)
        : supabase.from('bookshelf_items').insert(payload)

      const { error } = await request
      if (error) throw error

      close()
      await reload()
      done(row?.id ? '書籍已更新' : '書籍已新增', false)
    } catch (error: any) {
      done(`儲存失敗：${error?.message || String(error)}`, false)
    }
  }

  return (
    <div className="modal book-editor-overlay">
      <form className="panel book-editor" onSubmit={save}>
        <button type="button" className="modal-close" onClick={close}><X /></button>
        <h2>{row ? '編輯' : '新增'}書籍</h2>

        <label>
          搜尋書名、作者或 ISBN
          <div className="book-search">
            <input
              value={query}
              onChange={event => {
                setQuery(event.target.value)
                setPicked(null)
                setResults([])
                setManual(false)
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  search()
                }
              }}
              placeholder="台灣書籍、作者、ISBN 或中國網路小說"
            />
            <button type="button" disabled={searching} onClick={search}>
              <Search />{searching ? '搜尋中' : '搜尋'}
            </button>
          </div>
        </label>

        {results.length > 0 && (
          <div className="book-results">
            {results.map((book, index) => (
              <button
                type="button"
                onClick={() => selectResult(book)}
                key={`${book.source}-${book.source_id}-${index}`}
              >
                {book.image_url ? (
                  <img src={book.image_url} alt="" />
                ) : (
                  <span className="book-mini-empty"><BookOpen /></span>
                )}
                <span>
                  <b>{book.title}</b>
                  <small>
                    {book.author || '作者未提供'}
                    {book.publisher ? `・${book.publisher}` : ''}
                  </small>
                  <em>{sourceLabel(book)}</em>
                </span>
              </button>
            ))}
          </div>
        )}

        {picked && (
          <div className="book-picked">
            <Check />
            <span>
              <b>{picked.title}</b>
              <small>
                {picked.author || '作者未提供'}
                {picked.publisher ? `・${picked.publisher}` : ''}
                {`・${sourceLabel(picked)}`}
              </small>
            </span>
          </div>
        )}

        {manual && picked && (
          <div className="book-manual-fields">
            <label>
              完整書名
              <input
                value={picked.title}
                onChange={event => setPicked({ ...picked, title: event.target.value })}
                required
              />
            </label>
            <label>
              ISBN
              <input
                value={picked.isbn || ''}
                onChange={event => setPicked({ ...picked, isbn: event.target.value || null })}
              />
            </label>
            <label>
              封面圖片網址
              <input
                value={picked.image_url}
                onChange={event => setPicked({ ...picked, image_url: event.target.value })}
              />
            </label>
            <label>
              作者
              <input
                value={picked.author}
                onChange={event => setPicked({ ...picked, author: event.target.value })}
              />
            </label>
            <label>
              出版社
              <input
                value={picked.publisher}
                onChange={event => setPicked({ ...picked, publisher: event.target.value })}
              />
            </label>
            <label>
              簡介
              <textarea
                value={picked.description}
                onChange={event => setPicked({ ...picked, description: event.target.value })}
              />
            </label>
          </div>
        )}

        <button
          type="button"
          className="book-manual-toggle"
          onClick={() => {
            setManual(true)
            setResults([])
            setPicked(current => current || manualBook(query))
          }}
        >
          找不到？改用手動輸入
        </button>

        <label>
          閱讀狀態
          <select value={status} onChange={event => setStatus(event.target.value as BookStatus)}>
            {STATUS.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
          </select>
        </label>

        {status !== 'want' && (
          <>
            <label>
              評分
              <select value={rating} onChange={event => setRating(event.target.value)}>
                <option value="">不評分</option>
                {[1, 2, 3, 4, 5].map(value => (
                  <option value={value} key={value}>{value} 星</option>
                ))}
              </select>
            </label>
            <label>
              心得
              <textarea value={review} onChange={event => setReview(event.target.value)} placeholder="非必填" />
            </label>
            <label>
              佳句
              <textarea
                value={quotesText}
                onChange={event => setQuotesText(event.target.value)}
                placeholder="每行一則佳句，非必填"
              />
            </label>
          </>
        )}

        <button>儲存</button>
      </form>
    </div>
  )
}
