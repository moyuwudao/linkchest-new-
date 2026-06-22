const fs = require('fs')
const html = fs.readFileSync('/tmp/xhs-test2.html', 'utf-8')

const stateIdx = html.indexOf('__INITIAL_STATE__')
const eqIdx = html.indexOf('=', stateIdx)
const jsonStart = html.indexOf('{', eqIdx)

let depth = 0
let jsonEnd = -1
for (let i = jsonStart; i < html.length; i++) {
  if (html[i] === '{') depth++
  else if (html[i] === '}') {
    depth--
    if (depth === 0) { jsonEnd = i + 1; break }
  }
}

let stateStr = html.substring(jsonStart, jsonEnd)
// 把 JSON 不合法的 undefined 替换为 null
stateStr = stateStr.replace(/:undefined/g, ':null')
const state = JSON.parse(stateStr)

const noteMap = state.note?.noteDetailMap
if (noteMap) {
  const noteKey = Object.keys(noteMap)[0]
  const note = noteMap[noteKey]?.note
  if (note) {
    console.log('title:', note.title)
    console.log('desc:', note.desc)
    console.log('imageList[0].urlDefault:', note.imageList?.[0]?.urlDefault)
    console.log('imageList[0].urlPre:', note.imageList?.[0]?.urlPre)
  } else {
    console.log('note not found in noteMap[noteKey]')
  }
} else {
  console.log('noteMap not found')
  console.log('state.note:', JSON.stringify(state.note, null, 2).substring(0, 500))
}
