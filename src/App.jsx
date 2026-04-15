import React, { useEffect, useMemo, useState } from 'react'

const TODO_KEY = 'todoninja.todos.v1'
const THEME_KEY = 'todoninja.theme.v1'

// Background examples are visual hints only. Real todos live in state.
const exampleClouds = [
  { text: 'finish bootcamp notes', x: '7%', y: '19%', delay: '-2s' },
  { text: 'ship tiny app', x: '69%', y: '16%', delay: '-6s' },
  { text: 'debug calmly', x: '78%', y: '55%', delay: '-1s' },
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
    return stored ? JSON.parse(stored) : []
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
    const text = input.trim()

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

  return (
    <main className="app-shell">
      <div className="sky-texture" />

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

          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme(theme === 'day' ? 'night' : 'day')}
            aria-label={`Switch to ${theme === 'day' ? 'night' : 'day'} mode`}
          >
            <span className="toggle-glyph" aria-hidden="true" />
            {theme === 'day' ? 'Night' : 'Day'}
          </button>
        </nav>

        <div className="hero-grid">
          <section className="intro-panel">
            <img
              className="ninja-hero"
              src="/cloud-ninja.png"
              alt="Cute cloud ninja logo"
            />
            <p className="eyebrow">tiny todo dojo</p>
            <h1 id="app-title">Catch the task. Make it a cloud.</h1>
            <p className="lede">
              Add one todo. Watch it float. Tap the dot when done.
            </p>

            <form className="task-form" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="task-input">
                Add a todo
              </label>
              <input
                id="task-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Name the cloud"
                maxLength={70}
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

          <section className="cloud-board" aria-label="Todo cloud list">
            <div className="board-header">
              <div>
                <p className="eyebrow">sky count</p>
                <h2>
                  {remaining} open {remaining === 1 ? 'cloud' : 'clouds'}
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
                <p>No clouds yet.</p>
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

function TodoCloud({ todo, index, onToggle, onDelete }) {
  // The index changes only animation timing, not the todo data.
  const drift = 7 + (index % 4)
  const delay = `${index * -0.7}s`

  return (
    <li
      className={`todo-cloud ${todo.done ? 'is-done' : ''}`}
      style={{ '--drift': `${drift}s`, '--delay': delay }}
    >
      <div className="cloud-card">
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
    </li>
  )
}

export default App
