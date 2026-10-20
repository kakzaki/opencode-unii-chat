import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

test('history replacement, raw zoom, timestamps, persistence and deduplication', async () => {
  const root = mkdtempSync(join(tmpdir(), 'unii-test-'))
  process.env.UNII_DATA_DIR = root
  const { default: plugin } = await import('../src/index.js')
  const hooks = {}
  const tools = []
  const transcript = [
    { id: 'u1', type: 'user', text: 'The magic number is 4242.' },
    { id: 'a1', type: 'assistant', content: [{ type: 'text', text: 'Remembered.' }] },
    { id: 'u2', type: 'user', text: 'What was the number?' },
  ]
  let disposed = 0
  const registration = () => ({ dispose() { disposed++ } })
  const cleanup = await plugin.setup({
    location: { project: { id: 'project' } },
    session: {
      hook(name, callback) { hooks[name] = callback; return registration() },
      async context() { return transcript },
    },
    tool: { transform(callback) { callback({ namespace() {}, add(tool) { tools.push(tool) } }); return registration() } },
    generate: { async text() { return { text: 'A short summary.' } } },
  })
  try {
    const current = { role: 'user', content: [{ type: 'text', text: transcript[2].text }] }
    const event = { sessionID: 'session', system: [], messages: [{ role: 'user', content: [] }, current] }
    await hooks.context(event)
    assert.equal(event.messages.length, 2)
    assert.equal(event.messages[1], current)
    assert.match(event.messages[0].content[0].text, /4242/)
    assert.ok(event.system.some(part => part.text.includes('UniiChat memory')))
    const zoom = tools.find(tool => tool.name === 'unii_zoom')
    assert.match((await zoom.execute({ id: 0, n: 1 }, { sessionID: 'session' })).content, /4242/)
    assert.match((await zoom.execute({ id: 0, n: 3 }, { sessionID: 'session' })).content, /power of two/)
    const date = tools.find(tool => tool.name === 'unii_date')
    assert.ok(Number.isFinite(Date.parse((await date.execute({ id: 0 }, { sessionID: 'session' })).content)))
    const file = join(root, 'project', 'session', 'view.json')
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')).view, [[0, 0], [0, 1]])
    await hooks.context(event)
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')).view, [[0, 0], [0, 1]])
  } finally {
    await cleanup()
    assert.equal(disposed, 3)
    rmSync(root, { recursive: true, force: true })
  }
})
