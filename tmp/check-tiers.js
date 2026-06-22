const https = require('https');

https.get('https://linkchest.cn/api/tiers', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    json.data.forEach(t => {
      console.log(t.key, '->', JSON.stringify(t.pricing));
    });
  });
}).on('error', e => console.error(e));
