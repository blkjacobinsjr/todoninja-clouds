import React, { useEffect, useMemo, useState } from 'react'

const TODO_KEY = 'todoninja.todos.v1'
const THEME_KEY = 'todoninja.theme.v1'
const MAX_TODO_LENGTH = 70
const MAX_TODOS = 80

// Background examples are visual hints only. Real todos live in state.
const exampleClouds = [
  { text: 'finish bootcamp notes', x: '7%', y: '19%', delay: '-2s' },
  { text: 'ship tiny app', x: '69%', y: '16%', delay: '-6s' },
  { text: 'debug calmly', x: '78%', y: '55%', delay: '-1s' },
]

const skyClouds = [
  { top: '12%', scale: 1.1, duration: '72s', delay: '-18s', alpha: 0.42 },
  { top: '24%', scale: 0.78, duration: '64s', delay: '-34s', alpha: 0.34 },
  { top: '38%', scale: 1.28, duration: '82s', delay: '-8s', alpha: 0.38 },
  { top: '54%', scale: 0.92, duration: '70s', delay: '-44s', alpha: 0.3 },
  { top: '68%', scale: 1.42, duration: '88s', delay: '-26s', alpha: 0.32 },
  { top: '18%', scale: 1.56, duration: '96s', delay: '-52s', alpha: 0.26 },
  { top: '46%', scale: 1.02, duration: '76s', delay: '-60s', alpha: 0.28 },
  { top: '74%', scale: 0.86, duration: '68s', delay: '-12s', alpha: 0.24 },
]

const quotes = [
  {
    text: 'Do today before tomorrow starts charging interest.',
    by: 'Benjamin Franklin, todo remix',
  },
  {
    text: 'Getting started is the boss fight wearing pajamas.',
    by: 'Mark Twain, alleged energy',
  },
  {
    text: 'A finished small thing beats a perfect fog machine.',
    by: 'Octavia Butler inspired practice',
  },
]

function readTodos() {
  try {
    const stored = window.localStorage.getItem(TODO_KEY)
    const parsed = stored ? JSON.parse(stored) : []

    if (!Array.isArray(parsed)) return []

    return parsed.slice(0, MAX_TODOS).flatMap((todo) => {
      const text = cleanTodoText(todo?.text)

      if (!text) return []

      return {
        id:
          typeof todo?.id === 'string' && todo.id.trim()
            ? todo.id
            : globalThis.crypto?.randomUUID?.() || `${Date.now()}-stored`,
        text,
        done: Boolean(todo?.done),
        createdAt: Number.isFinite(todo?.createdAt)
          ? todo.createdAt
          : Date.now(),
      }
    })
  } catch {
    // If localStorage gets corrupted, the app should still load.
    return []
  }
}

function readTheme() {
  try {
    return window.localStorage.getItem(THEME_KEY) || 'day'
  } catch {
    return 'day'
  }
}

function makeTodo(text) {
  const fallbackId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return {
    // Stable ids let React update one cloud without rebuilding the whole sky.
    id: globalThis.crypto?.randomUUID?.() || fallbackId,
    text,
    done: false,
    createdAt: Date.now(),
  }
}

function cleanTodoText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TODO_LENGTH)
}

function App() {
  // State is the source of truth. localStorage only remembers it between visits.
  const [todos, setTodos] = useState(readTodos)
  const [input, setInput] = useState('')
  const [theme, setTheme] = useState(readTheme)
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [isDrawing, setIsDrawing] = useState(false)

  const remaining = useMemo(
    () => todos.filter((todo) => !todo.done).length,
    [todos],
  )

  useEffect(() => {
    // Side effect: persist todo changes after React updates state.
    window.localStorage.setItem(TODO_KEY, JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    // The data attribute lets CSS own the day and night visuals.
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    // One tiny timer is cheaper than animating text with JavaScript every frame.
    const timer = window.setInterval(() => {
      setQuoteIndex((current) => (current + 1) % quotes.length)
    }, 5200)

    return () => window.clearInterval(timer)
  }, [])

  function handleSubmit(event) {
    event.preventDefault()
    const text = cleanTodoText(input)

    if (!text) return

    // Add flow: validate input -> create todo -> render a new cloud.
    setTodos((current) => [makeTodo(text), ...current])
    setInput('')
    setIsDrawing(true)
    window.setTimeout(() => setIsDrawing(false), 520)
  }

  function toggleTodo(id) {
    setTodos((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, done: !todo.done } : todo,
      ),
    )
  }

  function deleteTodo(id) {
    setTodos((current) => current.filter((todo) => todo.id !== id))
  }

  function clearDone() {
    setTodos((current) => current.filter((todo) => !todo.done))
  }

  const quote = quotes[quoteIndex]
  const isFocusRoute = window.location.pathname !== '/'
  const cloudiness = remaining === 0 ? 0 : Math.min(1, 0.35 + remaining * 0.18)
  const weatherCloudCount = remaining === 0 ? 0 : Math.min(skyClouds.length, remaining + 2)
  const skyStyle = {
    '--cloudiness': String(cloudiness),
    '--clarity': String(1 - cloudiness),
  }

  if (isFocusRoute) {
    return (
      <FocusView
        clearDone={clearDone}
        handleSubmit={handleSubmit}
        input={input}
        isDrawing={isDrawing}
        quote={quote}
        remaining={remaining}
        setInput={setInput}
        setTheme={setTheme}
        theme={theme}
        todos={todos}
        skyStyle={skyStyle}
        toggleTodo={toggleTodo}
        deleteTodo={deleteTodo}
      />
    )
  }

  return (
    <main className="app-shell" style={skyStyle}>
      <div className="sky-texture" />
      <SkyClouds count={weatherCloudCount} />

      <section className="hero" aria-labelledby="app-title">
        {exampleClouds.map((cloud) => (
          <span
            className="example-cloud"
            key={cloud.text}
            style={{ left: cloud.x, top: cloud.y, '--delay': cloud.delay }}
          >
            {cloud.text}
          </span>
        ))}

        <nav className="top-bar" aria-label="App controls">
          <a className="brand-mark" href="/" aria-label="todoninja home">
            <img src="/cloud-ninja.png" alt="" />
            <span>todoninja</span>
          </a>

          <div className="top-actions">
            <ViewSwitcher isFocusRoute={false} />
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setTheme(theme === 'day' ? 'night' : 'day')}
              aria-label={`Switch to ${theme === 'day' ? 'night' : 'day'} mode`}
            >
              <span className="toggle-glyph" aria-hidden="true" />
              {theme === 'day' ? 'Night' : 'Day'}
            </button>
          </div>
        </nav>

        <div className="hero-grid">
          <section className="intro-panel">
            <img
              className="ninja-hero"
              src="/cloud-ninja.png"
              alt="Cute cloud ninja logo"
            />
            <p className="eyebrow">tiny todo dojo</p>
            <h1 id="app-title">one task, clear the clouds.</h1>
            <p className="lede">
              Add one todo. Watch it float. Tap the dot when done.
            </p>

            <form className="task-form" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="task-input">
                Add a task
              </label>
              <input
                id="task-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Name the task"
                maxLength={MAX_TODO_LENGTH}
                autoComplete="off"
              />
              <button type="submit">Add</button>
            </form>

            <div className={`sketch-progress ${isDrawing ? 'is-active' : ''}`}>
              <span />
            </div>

            <div className="quote-strip" aria-live="polite">
              <p>{quote.text}</p>
              <span>{quote.by}</span>
            </div>
          </section>

          <section className="cloud-board" aria-label="Task list">
            <div className="board-header">
              <div>
                <p className="eyebrow">sky count</p>
                <h2>
                  {remaining} open {remaining === 1 ? 'task' : 'tasks'}
                </h2>
              </div>
              <button
                className="ghost-button"
                type="button"
                onClick={clearDone}
                disabled={!todos.some((todo) => todo.done)}
              >
                Clear done
              </button>
            </div>

            {todos.length === 0 ? (
              <div className="empty-cloud">
                <p>No tasks yet.</p>
                <span>First task becomes the weather.</span>
              </div>
            ) : (
              <ul className="todo-list">
                {todos.map((todo, index) => (
                  <TodoCloud
                    key={todo.id}
                    todo={todo}
                    index={index}
                    onToggle={toggleTodo}
                    onDelete={deleteTodo}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}

function FocusView({
  clearDone,
  deleteTodo,
  handleSubmit,
  input,
  isDrawing,
  quote,
  remaining,
  setInput,
  setTheme,
  theme,
  todos,
  skyStyle,
  toggleTodo,
}) {
  return (
    <main className="app-shell focus-shell" style={skyStyle}>
      <div className="sky-texture" />
      <SkyClouds count={remaining === 0 ? 0 : Math.min(skyClouds.length, remaining + 2)} />

      <section className="focus-hero" aria-labelledby="focus-title">
        <nav className="top-bar focus-top-bar" aria-label="App controls">
          <a className="brand-mark" href="/" aria-label="todoninja home">
            <img src="/cloud-ninja.png" alt="" />
            <span>todoninja</span>
          </a>

          <div className="top-actions">
            <ViewSwitcher isFocusRoute />
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setTheme(theme === 'day' ? 'night' : 'day')}
              aria-label={`Switch to ${theme === 'day' ? 'night' : 'day'} mode`}
            >
              <span className="toggle-glyph" aria-hidden="true" />
              {theme === 'day' ? 'Night' : 'Day'}
            </button>
          </div>
        </nav>

        <div className="focus-panel">
          <p className="eyebrow">focus mode</p>
          <h1 id="focus-title">one task, clear the sky.</h1>
          <p className="lede">
            A centered capture space for when the next move matters more than
            the whole weather report.
          </p>

          <form className="task-form focus-task-form" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="focus-task-input">
              Add a focused task
            </label>
            <input
              id="focus-task-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Name the task"
              maxLength={MAX_TODO_LENGTH}
              autoComplete="off"
            />
            <button type="submit">Add</button>
          </form>

          <div className={`sketch-progress ${isDrawing ? 'is-active' : ''}`}>
            <span />
          </div>

          <div className="focus-meta">
            <span>
              {remaining} open {remaining === 1 ? 'task' : 'tasks'}
            </span>
            <button
              className="ghost-button"
              type="button"
              onClick={clearDone}
              disabled={!todos.some((todo) => todo.done)}
            >
              Clear done
            </button>
          </div>

          <div className="quote-strip focus-quote" aria-live="polite">
            <p>{quote.text}</p>
            <span>{quote.by}</span>
          </div>

          {todos.length === 0 ? (
            <div className="focus-empty">
              <p>No tasks yet.</p>
              <span>Start with one clean task.</span>
            </div>
          ) : (
            <ul className="todo-list focus-todo-list">
              {todos.map((todo, index) => (
                <TodoCloud
                  key={todo.id}
                  todo={todo}
                  index={index}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  )
}

function SkyClouds({ count }) {
  return (
    <div className="weather-clouds" aria-hidden="true">
      {skyClouds.slice(0, count).map((cloud, index) => (
        <div
          className="weather-cloud"
          key={`${cloud.top}-${index}`}
          style={{
            '--cloud-top': cloud.top,
            '--cloud-scale': cloud.scale,
            '--cloud-duration': cloud.duration,
            '--cloud-delay': cloud.delay,
            '--cloud-alpha': cloud.alpha,
          }}
        >
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  )
}

function ViewSwitcher({ isFocusRoute }) {
  return (
    <div className="view-switcher" aria-label="View switcher">
      <a
        className={`view-switcher-button ${isFocusRoute ? '' : 'is-active'}`}
        href="/"
        aria-label="Classic view"
        aria-current={isFocusRoute ? undefined : 'page'}
        title="Classic view"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1.6" />
          <rect x="14" y="3" width="7" height="7" rx="1.6" />
          <rect x="3" y="14" width="7" height="7" rx="1.6" />
          <rect x="14" y="14" width="7" height="7" rx="1.6" />
        </svg>
      </a>
      <a
        className={`view-switcher-button ${isFocusRoute ? 'is-active' : ''}`}
        href="/focus"
        aria-label="Focus view"
        aria-current={isFocusRoute ? 'page' : undefined}
        title="Focus view"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="8" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </a>
    </div>
  )
}

function TodoCloud({ todo, index, onToggle, onDelete }) {
  // The index changes only animation timing, not the todo data.
  const drift = 7 + (index % 4)
  const delay = `${index * -0.7}s`
  const shiftValue = ((index % 3) - 1) * 18
  const shift = `${shiftValue}px`
  const counterShift = `${shiftValue * -0.35}px`
  const tilt = `${((index % 5) - 2) * 0.45}deg`

  return (
    <li
      className={`todo-cloud ${todo.done ? 'is-done' : ''}`}
      style={{
        '--drift': `${drift}s`,
        '--delay': delay,
        '--cloud-shift': shift,
        '--cloud-counter-shift': counterShift,
        '--cloud-tilt': tilt,
      }}
    >
      <div className="cloud-group">
        <div className="cloud-bubble" />
        <div className="cloud-bubble" />
        <div className="cloud-bubble" />
        <div className="cloud-bubble" />
        <div className="cloud-bubble" />
        
        <div className="cloud-content">
          <button
            className="status-dot"
            type="button"
            onClick={() => onToggle(todo.id)}
            aria-label={`${todo.done ? 'Reopen' : 'Complete'} ${todo.text}`}
          >
            <span aria-hidden="true" />
          </button>
          <p>{todo.text}</p>
          <button
            className="delete-button"
            type="button"
            onClick={() => onDelete(todo.id)}
            aria-label={`Delete ${todo.text}`}
          >
            x
          </button>
        </div>
      </div>
    </li>
  )
}

export default App
