const fs = require('fs')
const html = fs.readFileSync('/tmp/xhs-test2.html', 'utf-8')
console.log('html size:', html.length)

const imgListMatch = html.match(/"imageList":\s*(\[[^\]]+\])/g)
console.log('imageList matches:', imgListMatch ? imgListMatch.length : 0)
if (imgListMatch && imgListMatch[0]) {
  console.log('first imageList:', imgListMatch[0].substring(0, 800))
}

const urlDefaultMatches = html.match(/"urlDefault"\s*:\s*"([^"]+)"/g)
console.log('urlDefault matches:', urlDefaultMatches ? urlDefaultMatches.length : 0)
if (urlDefaultMatches) {
  for (const m of urlDefaultMatches.slice(0, 5)) console.log(' ', m)
}

const xhsMatches = html.match(/https?:\/\/[^\s"]+xhscdn[^\s"]+/g)
console.log('xhscdn URL matches:', xhsMatches ? xhsMatches.length : 0)
if (xhsMatches) {
  for (const m of xhsMatches.slice(0, 8)) console.log(' ', m)
}

const imgExtMatches = html.match(/https?:\/\/[^\s"]+\.(jpg|jpeg|png|webp)/g)
console.log('image ext matches:', imgExtMatches ? imgExtMatches.length : 0)
if (imgExtMatches) {
  for (const m of imgExtMatches.slice(0, 5)) console.log(' ', m)
}

const stateIdx = html.indexOf('__INITIAL_STATE__')
console.log('__INITIAL_STATE__ at:', stateIdx)
if (stateIdx > 0) {
  console.log('snippet:', html.substring(stateIdx, stateIdx + 400))
}

const ogMatches = html.match(/og:image[^>]*content="([^"]+)"/g)
console.log('og:image matches:', ogMatches ? ogMatches.length : 0)
if (ogMatches) {
  for (const m of ogMatches.slice(0, 3)) console.log(' ', m.substring(0, 200))
}
