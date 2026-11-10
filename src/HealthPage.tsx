import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Apple,
  ChevronLeft,
  ChevronRight,
  Flame,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { supabase } from './supabase'
import './health-nutrition-search.css'

type HealthProfile = {
  weight_kg: number | null
  height_cm: number | null
  age: number | null
  sex: 'male' | 'female' | null
  activity_level: 'sedentary' | 'light' | 'moderate' | 'very' | 'extra' | null
}

type Meal = {
  id: string
  meal_date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'drink' | 'snack'
  description: string
  protein_g: number
  fat_g: number
  carbs_g: number
  calories: number
}

type FoodNutrition = {
  id: string
  name: string
  aliases: string[]
  calories: number
  protein: number
  fat: number
  carbs: number
  source?: 'local' | 'familymart'
  serving_g?: number | null
  serving_text?: string
  source_url?: string
}

type FamilyFoodResponse = {
  id: string
  name: string
  calories: number
  protein: number
  fat: number
  carbs: number
  serving_g: number | null
  serving_text: string
  source_url: string
  source: 'familymart'
}

const TYPES = [
  ['breakfast', '早餐'],
  ['lunch', '午餐'],
  ['dinner', '晚餐'],
  ['drink', '飲料'],
  ['snack', '點心'],
] as const

const ACTIVITIES = [
  ['sedentary', '久坐・幾乎沒有運動', 1.2],
  ['light', '輕度活動・每週運動 1–3 天', 1.375],
  ['moderate', '中度活動・每週運動 3–5 天', 1.55],
  ['very', '高度活動・每週高強度運動 6–7 天', 1.725],
  ['extra', '超高度活動・體力工作或每天高強度訓練', 1.9],
] as const

const round = (number: number, digits = 0) => Number(number.toFixed(digits))

function calcTargets(profile: HealthProfile) {
  const weight = Number(profile.weight_kg || 0)
  const height = Number(profile.height_cm || 0)
  const age = Number(profile.age || 0)

  if (!weight || !height || !age || !profile.sex || !profile.activity_level) {
    return null
  }

  const bmr =
    10 * weight +
    6.25 * height -
    5 * age +
    (profile.sex === 'male' ? 5 : -161)

  const activityFactor =
    ACTIVITIES.find(item => item[0] === profile.activity_level)?.[2] || 1.2

  const tdee = bmr * activityFactor
  const protein = weight * 1.6
  const fat = weight * 0.8
  const carbs = Math.max(0, (tdee - protein * 4 - fat * 9) / 4)

  return {
    bmr: round(bmr),
    tdee: round(tdee),
    activityFactor,
    protein: round(protein, 1),
    fat: round(fat, 1),
    carbs: round(carbs, 1),
  }
}

export default function HealthPage({ user, done }: any) {
  const [profile, setProfile] = useState<HealthProfile>({
    weight_kg: null,
    height_cm: null,
    age: null,
    sex: null,
    activity_level: null,
  })
  const [meals, setMeals] = useState<Meal[]>([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [profileEdit, setProfileEdit] = useState(false)
  const [mealEdit, setMealEdit] = useState<Meal | null | undefined>()

  async function load() {
    const [profileResult, mealsResult] = await Promise.all([
      supabase
        .from('health_profiles')
        .select('weight_kg,height_cm,age,sex,activity_level')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('health_meals')
        .select('*')
        .eq('meal_date', date)
        .order('created_at'),
    ])

    if (profileResult.error) return done(profileResult.error.message, false)
    if (mealsResult.error) return done(mealsResult.error.message, false)

    if (profileResult.data) setProfile(profileResult.data as HealthProfile)
    setMeals(mealsResult.data || [])
  }

  useEffect(() => {
    load()
  }, [date])

  const targets = calcTargets(profile)
  const totals = useMemo(
    () =>
      meals.reduce(
        (sum, meal) => ({
          protein: sum.protein + Number(meal.protein_g || 0),
          fat: sum.fat + Number(meal.fat_g || 0),
          carbs: sum.carbs + Number(meal.carbs_g || 0),
          calories: sum.calories + Number(meal.calories || 0),
        }),
        { protein: 0, fat: 0, carbs: 0, calories: 0 },
      ),
    [meals],
  )

  function moveDate(delta: number) {
    const currentDate = new Date(`${date}T12:00:00`)
    currentDate.setDate(currentDate.getDate() + delta)
    setDate(currentDate.toISOString().slice(0, 10))
  }

  async function removeMeal(id: string) {
    if (!confirm('確定刪除這筆飲食？')) return

    const { error } = await supabase.from('health_meals').delete().eq('id', id)
    if (error) return done(error.message, false)

    load()
    done('飲食紀錄已刪除', false)
  }

  return (
    <>
      <section className="health-head">
        <div>
          <h1>健康</h1>
          <small>每日營養目標與飲食紀錄</small>
        </div>
        <button onClick={() => setProfileEdit(true)}>
          <Pencil size={17} />身體資料
        </button>
      </section>

      {targets ? (
        <section className="health-target-grid">
          <article><Flame /><small>基本代謝 BMR</small><strong>{targets.bmr}</strong><span>kcal / 日</span></article>
          <article><Activity /><small>每日總消耗 TDEE</small><strong>{targets.tdee}</strong><span>kcal / 日・×{targets.activityFactor}</span></article>
          <article><Activity /><small>蛋白質目標</small><strong>{targets.protein}</strong><span>g / 日</span></article>
          <article><Activity /><small>脂肪目標</small><strong>{targets.fat}</strong><span>g / 日</span></article>
          <article><Apple /><small>碳水目標</small><strong>{targets.carbs}</strong><span>g / 日</span></article>
        </section>
      ) : (
        <section className="panel health-empty-profile">
          <b>先設定身體資料</b>
          <small>BMR 使用 Mifflin-St Jeor，TDEE 再乘上活動係數；需要體重、身高、年齡、公式使用的性別項目及活動量。</small>
          <button onClick={() => setProfileEdit(true)}>設定</button>
        </section>
      )}

      <div className="health-date-nav">
        <button onClick={() => moveDate(-1)}><ChevronLeft /></button>
        <input type="date" value={date} onChange={event => setDate(event.target.value)} />
        <button onClick={() => moveDate(1)}><ChevronRight /></button>
      </div>

      <section className="health-consumed panel">
        <div>
          <h2>今日攝取合計</h2>
          <b>{round(totals.calories)} kcal</b>
        </div>
        <div className="health-macro-grid">
          <Macro name="蛋白質" value={totals.protein} target={targets?.protein} />
          <Macro name="脂肪" value={totals.fat} target={targets?.fat} />
          <Macro name="碳水" value={totals.carbs} target={targets?.carbs} />
        </div>
      </section>

      {TYPES.map(([id, typeLabel]) => {
        const rows = meals.filter(meal => meal.meal_type === id)
        return (
          <section className="panel health-meal-section" key={id}>
            <h2>
              {typeLabel}
              <button onClick={() => setMealEdit({ meal_type: id, meal_date: date } as Meal)}><Plus /></button>
            </h2>
            {rows.length ? (
              rows.map(meal => (
                <div className="health-meal-row" key={meal.id}>
                  <button className="health-meal-main" onClick={() => setMealEdit(meal)}>
                    <span>
                      <b>{meal.description}</b>
                      <small>P {round(Number(meal.protein_g), 1)}g・F {round(Number(meal.fat_g), 1)}g・C {round(Number(meal.carbs_g), 1)}g</small>
                    </span>
                    <strong>{round(Number(meal.calories))} kcal</strong>
                  </button>
                  <button className="health-delete" onClick={() => removeMeal(meal.id)}><Trash2 size={17} /></button>
                </div>
              ))
            ) : (
              <p className="empty">尚未新增{typeLabel}</p>
            )}
          </section>
        )
      })}

      {profileEdit && (
        <ProfileEditor
          user={user}
          row={profile}
          done={done}
          close={() => setProfileEdit(false)}
          reload={load}
        />
      )}

      {mealEdit !== undefined && (
        <MealEditor
          user={user}
          row={mealEdit}
          date={date}
          done={done}
          close={() => setMealEdit(undefined)}
          reload={load}
        />
      )}
    </>
  )
}

function Macro({ name, value, target }: any) {
  const percentage = target ? Math.min(100, (Number(value) / target) * 100) : 0
  return (
    <div>
      <span>{name}</span>
      <b>{round(Number(value), 1)}{target ? ` / ${target}` : ''} g</b>
      <i><em style={{ width: `${percentage}%` }} /></i>
    </div>
  )
}

function ProfileEditor({ user, row, done, close, reload }: any) {
  const [weight, setWeight] = useState(String(row.weight_kg || ''))
  const [height, setHeight] = useState(String(row.height_cm || ''))
  const [age, setAge] = useState(String(row.age || ''))
  const [sex, setSex] = useState(row.sex || '')
  const [activity, setActivity] = useState(row.activity_level || 'sedentary')

  async function save(event: FormEvent) {
    event.preventDefault()
    const { error } = await supabase.from('health_profiles').upsert(
      {
        user_id: user.id,
        weight_kg: Number(weight),
        height_cm: Number(height),
        age: Number(age),
        sex,
        activity_level: activity,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

    if (error) return done(error.message, false)
    close()
    reload()
    done('身體資料已更新', false)
  }

  return (
    <div className="modal">
      <form className="panel health-editor" onSubmit={save}>
        <button type="button" className="modal-close" onClick={close}><X /></button>
        <h2>身體資料</h2>
        <label>體重（kg）<input type="number" min="20" max="400" step="0.1" value={weight} onChange={event => setWeight(event.target.value)} required /></label>
        <label>身高（cm）<input type="number" min="80" max="250" step="0.1" value={height} onChange={event => setHeight(event.target.value)} required /></label>
        <label>年齡<input type="number" min="10" max="120" value={age} onChange={event => setAge(event.target.value)} required /></label>
        <label>
          公式使用的性別項目
          <select value={sex} onChange={event => setSex(event.target.value)} required>
            <option value="">請選擇</option>
            <option value="male">男性公式（+5）</option>
            <option value="female">女性公式（-161）</option>
          </select>
        </label>
        <label>
          活動量
          <select value={activity} onChange={event => setActivity(event.target.value)} required>
            {ACTIVITIES.map(([id, activityLabel, factor]) => (
              <option value={id} key={id}>{activityLabel}（×{factor}）</option>
            ))}
          </select>
          <small>TDEE = BMR × 活動係數</small>
        </label>
        <button>儲存</button>
      </form>
    </div>
  )
}

function foodSearchKey(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('zh-TW')
    .replace(/[\s、，,()（）\-_\/]+/g, '')
}

function MealEditor({ user, row, date, done, close, reload }: any) {
  const [type, setType] = useState(row.meal_type || 'breakfast')
  const [description, setDescription] = useState(row.description || '')
  const [protein, setProtein] = useState(String(row.protein_g || ''))
  const [fat, setFat] = useState(String(row.fat_g || ''))
  const [carbs, setCarbs] = useState(String(row.carbs_g || ''))
  const [calories, setCalories] = useState(String(row.calories || ''))
  const [foods, setFoods] = useState<FoodNutrition[]>([])
  const [familyFoods, setFamilyFoods] = useState<FoodNutrition[]>([])
  const [foodLoading, setFoodLoading] = useState(false)
  const [foodError, setFoodError] = useState('')
  const [familyLoading, setFamilyLoading] = useState(false)
  const [familyError, setFamilyError] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodNutrition | null>(null)
  const [portion, setPortion] = useState('100')

  useEffect(() => {
    let active = true
    setFoodLoading(true)

    fetch('/food-nutrition-2025.json', { cache: 'force-cache' })
      .then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then(data => {
        if (!active) return
        const localFoods: FoodNutrition[] = Array.isArray(data)
          ? data.map((food: FoodNutrition) => ({
              ...food,
              aliases: Array.isArray(food.aliases) ? food.aliases : [],
              source: 'local',
            }))
          : []
        setFoods(localFoods)
      })
      .catch(error => {
        if (active) setFoodError(`食品資料庫載入失敗：${error?.message || String(error)}`)
      })
      .finally(() => {
        if (active) setFoodLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function searchFamilyFood() {
    const query = description.trim()

    if (!query) {
      setFamilyFoods([])
      return
    }

    setFamilyLoading(true)
    setFamilyError('')
    setSelectedFood(null)

    try {
      const { data, error } = await supabase.functions.invoke('family-food-search', {
        body: { query },
      })

      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || '全家商品搜尋失敗')

      const products: FoodNutrition[] = Array.isArray(data.products)
        ? data.products.map((product: FamilyFoodResponse) => ({
            id: product.id,
            name: product.name,
            aliases: [],
            calories: Number(product.calories || 0),
            protein: Number(product.protein || 0),
            fat: Number(product.fat || 0),
            carbs: Number(product.carbs || 0),
            source: 'familymart',
            serving_g: product.serving_g,
            serving_text: product.serving_text,
            source_url: product.source_url,
          }))
        : []

      setFamilyFoods(products)
      if (!products.length) setFamilyError('全家官方網站找不到相符商品')
    } catch (error: any) {
      setFamilyFoods([])
      setFamilyError(error?.message || String(error))
    } finally {
      setFamilyLoading(false)
    }
  }

  const results = useMemo(() => {
    const query = foodSearchKey(description)
    if (!query || selectedFood) return []

    const uniqueFoods = new Map<string, FoodNutrition>()
    for (const food of [...familyFoods, ...foods]) {
      const key = `${food.source || 'local'}:${food.id}`
      if (!uniqueFoods.has(key)) uniqueFoods.set(key, food)
    }

    return [...uniqueFoods.values()]
      .map(food => {
        const name = foodSearchKey(food.name)
        const aliases = (food.aliases || []).map(foodSearchKey)
        let score = 0

        if (name === query) score = 100
        else if (aliases.includes(query)) score = 95
        else if (name.startsWith(query)) score = 85
        else if (aliases.some(alias => alias.startsWith(query))) score = 80
        else if (name.includes(query)) score = 70
        else if (aliases.some(alias => alias.includes(query))) score = 65

        if (food.source === 'familymart' && score > 0) score += 10
        return { food, score }
      })
      .filter(item => item.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.food.name.localeCompare(right.food.name, 'zh-Hant'),
      )
      .slice(0, 20)
      .map(item => item.food)
  }, [description, foods, familyFoods, selectedFood])

  function applyFood(food: FoodNutrition, amount = 100) {
    setSelectedFood(food)
    setDescription(food.name)
    setFamilyError('')

    if (food.source === 'familymart') {
      setPortion(String(food.serving_g || 1))
      setCalories(String(round(food.calories, 1)))
      setCarbs(String(round(food.carbs, 1)))
      setProtein(String(round(food.protein, 1)))
      setFat(String(round(food.fat, 1)))
      return
    }

    const ratio = Math.max(0, amount) / 100
    setPortion(String(amount))
    setCalories(String(round(food.calories * ratio, 1)))
    setCarbs(String(round(food.carbs * ratio, 1)))
    setProtein(String(round(food.protein * ratio, 1)))
    setFat(String(round(food.fat * ratio, 1)))
  }

  function changePortion(value: string) {
    setPortion(value)
    if (!selectedFood) return

    const amount = Math.max(0, Number(value || 0))

    if (selectedFood.source === 'familymart') {
      const baseAmount = selectedFood.serving_g || 1
      const ratio = selectedFood.serving_g ? amount / baseAmount : amount
      setCalories(String(round(selectedFood.calories * ratio, 1)))
      setCarbs(String(round(selectedFood.carbs * ratio, 1)))
      setProtein(String(round(selectedFood.protein * ratio, 1)))
      setFat(String(round(selectedFood.fat * ratio, 1)))
      return
    }

    const ratio = amount / 100
    setCalories(String(round(selectedFood.calories * ratio, 1)))
    setCarbs(String(round(selectedFood.carbs * ratio, 1)))
    setProtein(String(round(selectedFood.protein * ratio, 1)))
    setFat(String(round(selectedFood.fat * ratio, 1)))
  }

  function manualMacro(kind: 'protein' | 'fat' | 'carbs', value: string) {
    setSelectedFood(null)
    const nextProtein = kind === 'protein' ? Number(value || 0) : Number(protein || 0)
    const nextFat = kind === 'fat' ? Number(value || 0) : Number(fat || 0)
    const nextCarbs = kind === 'carbs' ? Number(value || 0) : Number(carbs || 0)

    if (kind === 'protein') setProtein(value)
    if (kind === 'fat') setFat(value)
    if (kind === 'carbs') setCarbs(value)

    setCalories(String(round(nextProtein * 4 + nextFat * 9 + nextCarbs * 4, 1)))
  }

  async function save(event: FormEvent) {
    event.preventDefault()

    const payload = {
      user_id: user.id,
      meal_date: row.meal_date || date,
      meal_type: type,
      description: description.trim(),
      protein_g: Number(protein || 0),
      fat_g: Number(fat || 0),
      carbs_g: Number(carbs || 0),
      calories: Number(calories || 0),
      updated_at: new Date().toISOString(),
    }

    const request = row.id
      ? supabase.from('health_meals').update(payload).eq('id', row.id)
      : supabase.from('health_meals').insert(payload)

    const { error } = await request
    if (error) return done(error.message, false)

    close()
    reload()
    done('飲食紀錄已儲存', false)
  }

  return (
    <div className="modal">
      <form className="panel health-editor" onSubmit={save}>
        <button type="button" className="modal-close" onClick={close}><X /></button>
        <h2>{row.id ? '編輯' : '新增'}飲食</h2>

        <label>
          餐別
          <select value={type} onChange={event => setType(event.target.value)}>
            {TYPES.map(([id, typeLabel]) => (
              <option value={id} key={id}>{typeLabel}</option>
            ))}
          </select>
        </label>

        <label className="food-search-label">
          餐點內容
          <div className="food-search-wrap">
            <div className="food-family-search">
              <input
                value={description}
                onChange={event => {
                  setDescription(event.target.value)
                  setSelectedFood(null)
                  setFamilyFoods([])
                  setFamilyError('')
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    searchFamilyFood()
                  }
                }}
                placeholder="輸入食品或全家商品名稱"
                required
                autoComplete="off"
              />
              <button
                type="button"
                onClick={searchFamilyFood}
                disabled={familyLoading || !description.trim()}
              >
                <Search size={18} />
                {familyLoading ? '搜尋中' : '搜尋全家'}
              </button>
            </div>

            {foodLoading && <small className="food-search-status">本地食品資料載入中…</small>}
            {foodError && <small className="food-search-error">{foodError}</small>}
            {familyError && <small className="food-search-error">{familyError}</small>}

            {results.length > 0 && (
              <div className="food-search-results">
                {results.map(food => (
                  <button type="button" onClick={() => applyFood(food)} key={`${food.source}-${food.id}`}>
                    <span>
                      <b>{food.name}</b>
                      <small>
                        {food.source === 'familymart'
                          ? `全家官方・${food.serving_text || '每份營養標示'}`
                          : food.aliases.length
                            ? `俗名：${food.aliases.join('、')}`
                            : '本地食品資料庫・每 100 g'}
                      </small>
                    </span>
                    <em>
                      {round(food.calories, 1)} kcal
                      {food.source === 'familymart' ? ' / 每份' : ' / 100g'}
                    </em>
                  </button>
                ))}
              </div>
            )}
          </div>
        </label>

        {selectedFood && (
          <div className="food-selected">
            <div>
              <b>{selectedFood.name}</b>
              <small>
                {selectedFood.source === 'familymart'
                  ? `資料來源：全家食在購安心・${selectedFood.serving_text || '每份營養標示'}；實際數值請以商品包裝為準。`
                  : '營養資料為每 100 g 可食部分，已依份量換算。'}
              </small>
              {selectedFood.source_url && (
                <a href={selectedFood.source_url} target="_blank" rel="noreferrer">查看全家官方商品資料</a>
              )}
            </div>
            <label>
              {selectedFood.source === 'familymart' && !selectedFood.serving_g ? '份數' : '份量（g）'}
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={portion}
                onChange={event => changePortion(event.target.value)}
              />
            </label>
          </div>
        )}

        <div className="health-nutrient-inputs">
          <label>蛋白質（g）<input type="number" min="0" step="0.1" value={protein} onChange={event => manualMacro('protein', event.target.value)} /></label>
          <label>脂肪（g）<input type="number" min="0" step="0.1" value={fat} onChange={event => manualMacro('fat', event.target.value)} /></label>
          <label>碳水（g）<input type="number" min="0" step="0.1" value={carbs} onChange={event => manualMacro('carbs', event.target.value)} /></label>
        </div>

        <label>
          熱量（kcal）
          <input
            type="number"
            min="0"
            step="0.1"
            value={calories}
            onChange={event => {
              setSelectedFood(null)
              setCalories(event.target.value)
            }}
          />
        </label>

        <div className="health-calories">本筆熱量 <b>{round(Number(calories || 0))} kcal</b></div>
        <button>儲存</button>
      </form>
    </div>
  )
}
