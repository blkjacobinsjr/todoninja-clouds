# todoninja clouds

A radically small React todo app where tasks become clouds.

Live idea: one screen, one input, one sky.

## What it does

- Adds todos as animated cloud cards
- Toggles done state
- Deletes todos
- Clears completed todos
- Saves todos and theme to localStorage
- Switches between day and night mode

## Mental model

```text
state -> event -> render
todos -> add, toggle, delete -> clouds on screen
```

## Pseudocode

```text
load saved todos
load saved theme

when user submits text:
  trim the input
  if empty, stop
  create a todo object
  add it to the front of the todo array
  save todos to localStorage
  render the todo as a cloud

when user taps the status dot:
  find that todo
  flip done true or false
  save updated todos
  update the cloud style

when user switches theme:
  set theme to day or night
  save theme to localStorage
  let CSS redraw the sky
```

## Why it is built this way

- React state handles the current list because the UI must update instantly.
- localStorage keeps the project simple. No backend is needed for bootcamp scope.
- CSS handles animation with transform and opacity because those are browser-friendly.
- The todo cards are clouds because the visual metaphor makes the data model easier to remember.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
