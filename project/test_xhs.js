const https = require('https');

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      },
      timeout: 15000,
      rejectUnauthorized: false
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

fetchHtml('https://www.xiaohongshu.com/explore/6a0fc3b40000000035033ae5').then(html => {
  const m = html.match(/window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)(?:;\s*<\/script>|<\/script>)/);
  if (m) {
    let s = m[1].trim();
    if (s.endsWith(';')) s = s.slice(0, -1);
    const state = JSON.parse(s.replace(/undefined/g, 'null'));
    console.log('noteData.data keys:', state.noteData ? Object.keys(state.noteData.data || {}) : 'no noteData');
    if (state.noteData && state.noteData.data) {
      const d = state.noteData.data;
      console.log('data.noteId:', d.noteId);
      console.log('data.title:', d.title);
      console.log('data.displayTitle:', d.displayTitle);
      console.log('data.desc:', d.desc);
      console.log('data.cover:', JSON.stringify(d.cover));
      console.log('data.imageList length:', d.imageList ? d.imageList.length : 0);
      if (d.imageList && d.imageList[0]) {
        console.log('first image:', JSON.stringify(d.imageList[0]));
      }
    }
  } else {
    console.log('NO MATCH');
  }
  process.exit(0);
}).catch(err => {
  console.log('ERROR:', err.message);
  process.exit(1);
});
