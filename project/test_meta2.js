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

async function testDouyin(url) {
  console.log('\n========== Douyin User Page Deep Dive ==========');
  console.log('URL:', url);
  try {
    const { html, status } = await fetchHtml(url);
    console.log('Status:', status, 'HTML length:', html.length);
    
    // Save first 5000 chars to inspect
    console.log('\n--- First 3000 chars of HTML ---');
    console.log(html.substring(0, 3000));
    console.log('\n--- End first 3000 chars ---');
    
    // Check for any script tags with data
    const scriptMatches = html.match(/<script[^>]*>[^]*?<\/script>/g);
    if (scriptMatches) {
      console.log('\n--- Script tags found:', scriptMatches.length);
      scriptMatches.slice(0, 5).forEach((s, i) => {
        const preview = s.substring(0, 200).replace(/\s+/g, ' ');
        console.log(`Script ${i}:`, preview);
      });
    }
    
    // Check for any JSON-like data structures
    const jsonLike = html.match(/window\.[A-Z_]+\s*=/g);
    console.log('\nWindow assignments:', jsonLike);
    
    // Check for RENDER_DATA
    if (html.includes('RENDER_DATA')) {
      const rdMatch = html.match(/window\._SSR_HYDRATED_DATA\s*=\s*(.+?);\s*<\/script>/);
      if (rdMatch) console.log('RENDER_DATA length:', rdMatch[1].length);
    }
    
  } catch(err) {
    console.log('ERROR:', err.message);
  }
}

async function testXiaohongshu(url) {
  console.log('\n========== Xiaohongshu Deep Dive ==========');
  console.log('URL:', url);
  try {
    const { html, status } = await fetchHtml(url);
    console.log('Status:', status, 'HTML length:', html.length);
    
    const initMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)(?:;\s*<\/script>|<\/script>)/);
    if (initMatch) {
      let jsonStr = initMatch[1].trim();
      if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);
      const state = JSON.parse(jsonStr.replace(/undefined/g, 'null'));
      console.log('\nState keys:', Object.keys(state));
      
      // Inspect noteData
      if (state.noteData) {
        console.log('\nnoteData keys:', Object.keys(state.noteData));
        if (state.noteData.note) {
          console.log('noteData.note keys:', Object.keys(state.noteData.note));
          console.log('note.title:', state.noteData.note.title);
          console.log('note.displayTitle:', state.noteData.note.displayTitle);
          console.log('note.cover:', state.noteData.note.cover);
          console.log('note.imageList:', state.noteData.note.imageList ? state.noteData.note.imageList.length : 0);
          if (state.noteData.note.imageList && state.noteData.note.imageList[0]) {
            console.log('first image:', state.noteData.note.imageList[0]);
          }
        }
      }
      
      // Inspect all levels
      const inspect = (obj, depth = 0) => {
        if (depth > 3 || !obj || typeof obj !== 'object') return;
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (val && typeof val === 'object') {
            if (val.url || val.cover || val.imageList || val.title) {
              console.log(`  [depth ${depth}] ${key}:`, Object.keys(val));
            }
            inspect(val, depth + 1);
          }
        }
      };
      console.log('\n--- Inspecting state for media data ---');
      inspect(state);
    }
    
  } catch(err) {
    console.log('ERROR:', err.message);
  }
}

(async () => {
  await testDouyin('https://www.douyin.com/user/MS4wLjABAAAA7r3nFeL4x8mRiaH-4R2N1p5n5n5n5n5n5n5n5n5n5n5n?modal_id=7632279378365815909');
  await testXiaohongshu('https://www.xiaohongshu.com/explore/6a0fc3b40000000035033ae5');
})();
