const https = require('https');

// 测试小红书
const xhsUrl = 'https://www.xiaohongshu.com/explore/6a0fc3b40000000035033ae5';
console.log('=== 测试小红书 ===');
console.log('URL:', xhsUrl);

https.get(xhsUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('响应状态:', res.statusCode);

    const initMatch = data.match(/window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)(?:;\s*<\/script>|<\/script>)/);
    if (initMatch) {
      console.log('找到 __INITIAL_STATE__，长度:', initMatch[1].length);
      try {
        let jsonStr = initMatch[1].trim();
        if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);
        const state = JSON.parse(jsonStr.replace(/undefined/g, 'null'));
        console.log('JSON keys:', Object.keys(state).join(', '));

        const findNote = (obj, path = '') => {
          if (!obj || typeof obj !== 'object') return null;
          if (obj.noteId || (obj.note && obj.note.noteId)) {
            console.log('Found note at:', path);
            return obj.note || obj;
          }
          if (obj.noteDetailMap) {
            for (const key of Object.keys(obj.noteDetailMap)) {
              const note = obj.noteDetailMap[key]?.note;
              if (note?.noteId) {
                console.log('Found in noteDetailMap:', path + '.noteDetailMap.' + key);
                return note;
              }
            }
          }
          if (obj.noteData?.data) {
            console.log('Found in noteData:', path + '.noteData');
            return obj.noteData.data;
          }
          for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (val && typeof val === 'object' && !Array.isArray(val)) {
              const found = findNote(val, path + '.' + key);
              if (found) return found;
            }
          }
          return null;
        };

        const note = findNote(state, 'state');
        if (note) {
          console.log('Note title:', note.title || note.displayTitle);
          console.log('Note cover:', note.cover?.url || note.cover);
        } else {
          console.log('未找到 note 数据');
        }
      } catch (e) {
        console.log('JSON 解析错误:', e.message);
      }
    } else {
      console.log('未找到 __INITIAL_STATE__');
      if (data.includes('xhs_sec') || data.includes('/404/')) {
        console.log('页面可能需要 JS 渲染');
      }
      // 打印前500字符
      console.log('HTML 前500字符:', data.substring(0, 500));
    }
  });
}).on('error', (e) => console.error('请求错误:', e.message));
