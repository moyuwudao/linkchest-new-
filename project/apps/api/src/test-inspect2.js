const fs = require('fs')
const html = fs.readFileSync('/tmp/xhs-test2.html', 'utf-8')

// 找到 __INITIAL_STATE__ 之后的 JSON
const stateIdx = html.indexOf('__INITIAL_STATE__')
const eqIdx = html.indexOf('=', stateIdx)
const jsonStart = html.indexOf('{', eqIdx)

// 括号匹配找 JSON 结束
let depth = 0
let jsonEnd = -1
for (let i = jsonStart; i < html.length; i++) {
  if (html[i] === '{') depth++
  else if (html[i] === '}') {
    depth--
    if (depth === 0) { jsonEnd = i + 1; break }
  }
}

const stateStr = html.substring(jsonStart, jsonEnd)
const state = JSON.parse(stateStr)

// 探查结构
function explore(obj, path, depth) {
  if (depth > 3) return
  if (obj === null || typeof obj !== 'object') return
  if (Array.isArray(obj)) {
    console.log('  '.repeat(depth) + path + ' [array len=' + obj.length + ']')
    if (obj.length > 0 && depth < 2) explore(obj[0], path + '[0]', depth + 1)
    return
  }
  const keys = Object.keys(obj)
  if (path === '') console.log('root keys:', keys.join(', '))
  for (const k of keys) {
    if (k === 'note' || k === 'noteDetailMap' || k === 'noteDetail' || k.startsWith('note')) {
      console.log('  '.repeat(depth) + '* ' + k)
    }
  }
  for (const k of keys.slice(0, 25)) {
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      console.log('  '.repeat(depth) + k)
      if (depth < 2) explore(obj[k], k, depth + 1)
    }
  }
}

explore(state, '', 0)

// 直接搜 noteDetailMap
const s = JSON.stringify(state)
const idx = s.indexOf('noteDetailMap')
console.log('\nnoteDetailMap at:', idx)
if (idx > 0) {
  console.log('snippet:', s.substring(Math.max(0, idx - 50), idx + 400))
}

const idx2 = s.indexOf('imageList')
console.log('\nimageList at:', idx2)
if (idx2 > 0) {
  console.log('snippet:', s.substring(Math.max(0, idx2 - 50), idx2 + 400))
}
