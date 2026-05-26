const https = require('https');

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : require('http');
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      },
      timeout: 15000,
      rejectUnauthorized: false
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchHtml(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ html: data, status: res.statusCode }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function testUrl(url, name) {
  console.log('\n========== ' + name + ' ==========');
  console.log('URL:', url);
  try {
    const { html, status } = await fetchHtml(url);
    console.log('Status:', status);
    console.log('HTML length:', html.length);
    console.log('Has _SSR_HYDRATED_DATA:', html.includes('_SSR_HYDRATED_DATA'));
    console.log('Has __INITIAL_STATE__:', html.includes('__INITIAL_STATE__'));
    console.log('Has og:title:', html.includes('og:title'));
    console.log('Has og:image:', html.includes('og:image'));
    console.log('Has <h1:', html.includes('<h1'));
    console.log('Has video-info:', html.includes('video-info'));
    console.log('Has note-content:', html.includes('note-content'));
    console.log('Has id=root:', html.includes('id="root"'));
    console.log('Has id=app:', html.includes('id="app"'));

    const hasContent = html.includes('class="video-info"') ||
      html.includes('class="content"') ||
      html.includes('class="desc"') ||
      html.includes('class="title"') ||
      html.includes('class="note-content"') ||
      html.includes('<script>window._SSR_HYDRATED_DATA') ||
      html.includes('__INITIAL_STATE__') ||
      html.includes('RENDER_DATA') ||
      html.includes('SSR_HYDRATED_DATA') ||
      html.includes('<div id="root">') ||
      html.includes('<div id="app">');
    console.log('hasContent:', hasContent);

    const isAntiBot = !html.includes('<meta property="og:') && !html.includes('<h1') && html.length < 50000 && !hasContent;
    console.log('isAntiBot (current logic):', isAntiBot);

    if (url.includes('douyin')) {
      const ssrMatch = html.match(/<script>window\._SSR_HYDRATED_DATA=(.+?)<\/script>/)
        || html.match(/window\._SSR_HYDRATED_DATA\s*=\s*(.+?);\s*<\/script>/);
      if (ssrMatch) {
        console.log('Found SSR data, length:', ssrMatch[1].length);
        try {
          const data = JSON.parse(ssrMatch[1]);
          console.log('SSR keys:', Object.keys(data || {}));
          if (data && data.app) {
            console.log('app keys:', Object.keys(data.app));
            console.log('has videoList:', !!data.app.videoList);
            console.log('has itemList:', !!data.app.itemList);
            console.log('videoList length:', data.app.videoList ? data.app.videoList.length : 0);
            if (data.app.videoList && data.app.videoList[0]) {
              console.log('first video keys:', Object.keys(data.app.videoList[0]));
            }
          }
        } catch(e) {
          console.log('SSR parse error:', e.message);
        }
      } else {
        console.log('NO SSR data found');
      }
    }

    if (url.includes('xiaohongshu')) {
      const initMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)(?:;\s*<\/script>|<\/script>)/);
      if (initMatch) {
        console.log('Found INITIAL_STATE, length:', initMatch[1].length);
        try {
          let jsonStr = initMatch[1].trim();
          if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);
          const state = JSON.parse(jsonStr.replace(/undefined/g, 'null'));
          console.log('State keys:', Object.keys(state || {}));

          const findNote = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj.noteId || (obj.note && obj.note.noteId)) return obj.note || obj;
            if (obj.noteDetailMap) {
              for (const key of Object.keys(obj.noteDetailMap)) {
                if (obj.noteDetailMap[key] && obj.noteDetailMap[key].note) return obj.noteDetailMap[key].note;
              }
            }
            for (const key of Object.keys(obj)) {
              const val = obj[key];
              if (val && typeof val === 'object' && !Array.isArray(val)) {
                const found = findNote(val);
                if (found) return found;
              }
            }
            return null;
          };
          const note = findNote(state);
          if (note) {
            console.log('Found note!');
            console.log('note.title:', note.title);
            console.log('note.displayTitle:', note.displayTitle);
            console.log('note.cover?.url:', note.cover ? note.cover.url : undefined);
            console.log('note.imageList?.[0]?.url:', note.imageList && note.imageList[0] ? note.imageList[0].url : undefined);
          } else {
            console.log('NO note found in state');
          }
        } catch(e) {
          console.log('INITIAL_STATE parse error:', e.message);
        }
      } else {
        console.log('NO INITIAL_STATE found');
      }

      const imgMatch = html.match(/src="([^"]*xhscdn[^"]*\.(?:jpe?g|webp)[^"]*)"/);
      if (imgMatch) {
        console.log('Found xhscdn image:', imgMatch[1]);
      }
    }

  } catch(err) {
    console.log('ERROR:', err.message);
  }
}

(async () => {
  await testUrl('https://www.douyin.com/user/MS4wLjABAAAA7r3nFeL4x8mRiaH-4R2N1p5n5n5n5n5n5n5n5n5n5n5n?modal_id=7632279378365815909', 'Douyin User Page');
  await testUrl('https://www.xiaohongshu.com/explore/6a0fc3b40000000035033ae5', 'Xiaohongshu');
})();
