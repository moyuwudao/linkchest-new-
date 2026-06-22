const fs = require('fs')
const html = fs.readFileSync('/tmp/xhs-test2.html', 'utf-8')
console.log('html size:', html.length)

// 查找 imageList
const imgListMatch = html.match(/"imageList":\s*(\[[^\]]+\])/g)
console.log('imageList matches:', imgListMatch?.length || 0)
if (imgListMatch && imgListMatch[0]) {
  console.log('first imageList:', imgListMatch[0].substring(0, 800))
}

// 查找 urlDefault
const urlDefaultMatches = html.match(/"urlDefault"\s*:\s*"([^"]+)"/g)
console.log('urlDefault matches:', urlDefaultMatches?.length || 0)
if (urlDefaultMatches) {
  for (const m of urlDefaultMatches.slice(0, 5)) {
    console.log(' ', m)
  }
}

// 查找 xhscdn
const xhsMatches = html.match(/https?:\\/\\/[^\s"\\]+xhscdn[^\s"\\]+/g)
console.log('xhscdn URL matches:', xhsMatches?.length || 0)
if (xhsMatches) {
  for (const m of xhsMatches.slice(0, 5)) console.log(' ', m)
}

// 查找图片相关的 .jpg/.png/.webp
const imgExtMatches = html.match(/https?:\\/\\/[^\s"\\]+\.(jpg|jpeg|png|webp)[^\s"\\]*/g)
console.log('image ext matches:', imgExtMatches?.length || 0)
if (imgExtMatches) {
  for (const m of imgExtMatches.slice(0, 5)) console.log(' ', m)
}

// 查找 INITIAL_STATE 位置
const stateIdx = html.indexOf('__INITIAL_STATE__')
console.log('__INITIAL_STATE__ at:', stateIdx)
if (stateIdx > 0) {
  // 取 200 字符看看
  console.log('snippet:', html.substring(stateIdx, stateIdx + 300))
}
