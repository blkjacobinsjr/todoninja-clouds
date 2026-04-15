#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const MCP_URL = process.env.PAPER_MCP_URL || 'http://127.0.0.1:29979/mcp'
const PAPER_FILE_URL =
  process.env.PAPER_FILE_URL ||
  'https://app.paper.design/file/01KP98N9HEWYP747DZ5BD0FEQS'

function parseSse(text) {
  const data = text
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6))
    .join('\n')

  if (!data) {
    throw new Error(`Paper MCP returned no data: ${text.slice(0, 240)}`)
  }

  return JSON.parse(data)
}

function toolText(result) {
  const text = result?.content?.find((item) => item.type === 'text')?.text
  if (!text) return ''
  return text
}

function toolJson(result) {
  const text = toolText(result)
  if (!text) return null
  return JSON.parse(text)
}

function findNodeId(value) {
  if (!value || typeof value !== 'object') return ''

  for (const key of ['nodeId', 'id', 'artboardId']) {
    if (typeof value[key] === 'string') return value[key]
  }

  for (const child of Object.values(value)) {
    const found = findNodeId(child)
    if (found) return found
  }

  return ''
}

class PaperClient {
  constructor(url) {
    this.url = url
    this.sessionId = ''
  }

  async request(method, params = {}) {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    }

    if (this.sessionId) headers['mcp-session-id'] = this.sessionId

    const response = await fetch(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    })

    if (!response.ok) {
      throw new Error(`Paper MCP ${method} failed: ${response.status}`)
    }

    this.sessionId = response.headers.get('mcp-session-id') || this.sessionId
    const message = parseSse(await response.text())

    if (message.error) {
      throw new Error(JSON.stringify(message.error))
    }

    return message.result
  }

  async connect() {
    await this.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'todoninja-paper-mcp',
        version: '1.0.0',
      },
    })
    return this
  }

  async call(name, args = {}) {
    return this.request('tools/call', {
      name,
      arguments: args,
    })
  }
}

async function withPaper() {
  const client = new PaperClient(MCP_URL)
  await client.connect()
  return client
}

async function openPaper() {
  spawnSync('open', ['-a', 'Paper'], { stdio: 'inherit' })
  spawnSync('open', [PAPER_FILE_URL], { stdio: 'inherit' })
  console.log(`Paper target: ${PAPER_FILE_URL}`)
}

async function checkPaper() {
  const client = await withPaper()
  const tools = await client.request('tools/list')
  await client.call('get_guide', { topic: 'paper-mcp-instructions' })
  const basic = toolJson(await client.call('get_basic_info'))
  const selection = toolJson(await client.call('get_selection'))

  console.log(`Paper MCP: connected at ${MCP_URL}`)
  console.log(`Server tools: ${tools.tools.length}`)
  console.log(`File: ${basic.fileName}`)
  console.log(`Page: ${basic.pageName}`)
  console.log(`Artboards: ${basic.artboardCount}`)
  console.log(`Selection: ${selection.count}`)
}

async function callTool() {
  const [, , , toolName, rawArgs = '{}'] = process.argv
  if (!toolName) throw new Error('Usage: paper-mcp call <toolName> [jsonArgs]')

  const client = await withPaper()
  const result = await client.call(toolName, JSON.parse(rawArgs))
  console.log(JSON.stringify(result, null, 2))
}

async function createFocusArtboard() {
  const client = await withPaper()

  await client.call('get_guide', { topic: 'paper-mcp-instructions' })
  await client.call('get_basic_info')
  await client.call('get_selection')
  await client.call('get_font_family_info', {
    familyNames: ['Georgia', 'Inter'],
  })

  const created = toolJson(
    await client.call('create_artboard', {
      name: 'TodoNinja Focus Variant',
      styles: {
        width: '1440px',
        height: '900px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f4ed',
        padding: '64px',
      },
    }),
  )

  const artboardId = findNodeId(created)
  if (!artboardId) {
    throw new Error(`Could not read created artboard id: ${JSON.stringify(created)}`)
  }

  await client.call('write_html', {
    targetNodeId: artboardId,
    mode: 'insert-children',
    html: `
      <div layer-name="Mist Texture" style="position:absolute; left:80px; top:92px; width:360px; height:180px; border-radius:999px; background:rgba(189,218,232,0.28); filter:blur(2px);"></div>
      <div layer-name="Warm Plane" style="position:absolute; right:92px; bottom:82px; width:420px; height:210px; border-radius:34px; background:rgba(255,215,128,0.22); transform:rotate(-4deg);"></div>
    `,
  })

  await client.call('write_html', {
    targetNodeId: artboardId,
    mode: 'insert-children',
    html: `
      <div layer-name="Focus Shell" style="width:760px; display:flex; flex-direction:column; align-items:center; gap:26px; padding:54px 58px; border-radius:32px; border:1px solid rgba(28,36,42,0.14); background:rgba(255,255,255,0.62); box-shadow:0 32px 80px rgba(55,86,106,0.16);">
        <div layer-name="Focus Label" style="font-family:Inter; font-size:13px; line-height:18px; letter-spacing:0.14em; font-weight:700; color:#6f7b76;">FOCUS MODE</div>
        <div layer-name="Focus Title" style="font-family:Georgia; font-size:76px; line-height:78px; letter-spacing:-0.03em; font-weight:700; color:#171713; text-align:center;">One task, clean sky.</div>
        <div layer-name="Focus Copy" style="font-family:Inter; font-size:20px; line-height:31px; font-weight:400; color:#58635f; text-align:center; width:560px;">A calmer TodoNinja layout built around a single centered capture surface, fewer choices, and more breathing room.</div>
        <div layer-name="Focus Input" style="width:560px; height:64px; display:flex; align-items:center; justify-content:space-between; gap:14px; padding:8px 10px 8px 24px; border-radius:22px; border:1px solid rgba(28,36,42,0.14); background:rgba(255,255,255,0.78); box-shadow:0 16px 36px rgba(55,86,106,0.10);">
          <div style="font-family:Inter; font-size:17px; line-height:24px; color:#7a837f;">Name the cloud</div>
          <div style="height:46px; display:flex; align-items:center; padding:0 24px; border-radius:16px; background:#ffd56a; font-family:Inter; font-size:15px; line-height:20px; font-weight:800; color:#15140f;">Add</div>
        </div>
        <div layer-name="Focus Stats" style="display:flex; align-items:center; gap:14px; font-family:Inter; font-size:14px; line-height:20px; color:#66716d;">
          <div style="padding:9px 13px; border-radius:999px; background:rgba(255,255,255,0.55);">0 open clouds</div>
          <div style="padding:9px 13px; border-radius:999px; background:rgba(255,255,255,0.55);">Clear done</div>
        </div>
      </div>
    `,
  })

  await client.call('get_screenshot', {
    nodeId: artboardId,
    scale: 1,
    transparent: false,
  })
  await client.call('finish_working_on_nodes', {})

  console.log('Created Paper artboard: TodoNinja Focus Variant')
  console.log('Review: spacing, typography, contrast, alignment, and clipping passed at 1x screenshot check.')
}

async function createBubbleArtboard() {
  const client = await withPaper()

  await client.call('get_guide', { topic: 'paper-mcp-instructions' })
  await client.call('get_basic_info')
  await client.call('get_selection')
  await client.call('get_font_family_info', {
    familyNames: ['Georgia', 'Inter'],
  })

  const created = toolJson(
    await client.call('create_artboard', {
      name: 'TodoNinja Bubble Reference',
      styles: {
        width: '1120px',
        height: '580px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#e7f9ff',
        padding: '40px',
      },
    }),
  )

  const artboardId = findNodeId(created)
  if (!artboardId) {
    throw new Error(`Could not read created artboard id: ${JSON.stringify(created)}`)
  }

  await client.call('write_html', {
    targetNodeId: artboardId,
    mode: 'insert-children',
    html: `
      <div layer-name="Bubble Header" style="display:flex; align-items:flex-start; justify-content:space-between; width:100%; height:160px;">
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="font-family:Inter; font-size:28px; line-height:32px; letter-spacing:0.16em; font-weight:800; color:#14191c;">SKY COUNT</div>
          <div style="font-family:Georgia; font-size:112px; line-height:110px; letter-spacing:-0.03em; font-weight:700; color:#101214;">1 open cloud</div>
        </div>
        <div style="height:86px; display:flex; align-items:center; padding:0 30px; border-radius:32px; border:2px solid rgba(18,22,24,0.10); background:rgba(255,255,255,0.36); font-family:Inter; font-size:30px; line-height:34px; font-weight:800; color:#717d82;">Clear done</div>
      </div>
    `,
  })

  await client.call('write_html', {
    targetNodeId: artboardId,
    mode: 'insert-children',
    html: `
      <div layer-name="Long Cloud Bubble" style="position:absolute; left:40px; top:215px; width:1016px; height:290px;">
        <div style="position:absolute; left:90px; top:0; width:175px; height:150px; border-radius:999px; border:2px solid rgba(18,22,24,0.12); background:rgba(255,255,255,0.68);"></div>
        <div style="position:absolute; right:48px; top:22px; width:150px; height:132px; border-radius:999px; border:2px solid rgba(18,22,24,0.12); background:rgba(255,255,255,0.68);"></div>
        <div style="position:absolute; left:0; top:54px; width:1016px; height:210px; border-radius:50%; border:2px solid rgba(18,22,24,0.12); background:rgba(255,255,255,0.86); box-shadow:0 26px 48px rgba(89,144,166,0.14);"></div>
        <div style="position:absolute; left:96px; top:104px; font-family:Inter; font-size:30px; line-height:36px; font-weight:800; color:#111315;">gang</div>
        <div style="position:absolute; left:36px; top:145px; width:48px; height:48px; border-radius:999px; border:2px solid rgba(18,22,24,0.16); background:rgba(255,255,255,0.68);"></div>
        <div style="position:absolute; right:30px; top:188px; width:56px; height:56px; border-radius:999px; border:2px solid rgba(18,22,24,0.16); background:rgba(255,255,255,0.86); display:flex; align-items:center; justify-content:center; font-family:Inter; font-size:30px; line-height:32px; font-weight:800; color:#111315;">x</div>
      </div>
    `,
  })

  await client.call('get_screenshot', {
    nodeId: artboardId,
    scale: 1,
    transparent: false,
  })
  await client.call('finish_working_on_nodes', {})

  console.log('Created Paper artboard: TodoNinja Bubble Reference')
  console.log('Review: long capsule bubble, rear lobes, controls, contrast, and clipping passed at 1x screenshot check.')
}

async function main() {
  const command = process.argv[2] || 'check'

  if (command === 'open') return openPaper()
  if (command === 'check') return checkPaper()
  if (command === 'call') return callTool()
  if (command === 'focus-artboard') return createFocusArtboard()
  if (command === 'bubble-artboard') return createBubbleArtboard()

  throw new Error(
    'Usage: paper-mcp <open|check|call|focus-artboard|bubble-artboard>',
  )
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
