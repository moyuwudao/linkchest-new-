const https = require('https');
https.get('https://www.douyin.com/user/MS4wLjABAAAA7r3nFeL4x8mRiaH-4R2N1p5n5n5n5n5n5n5n5n5n5n5n?modal_id=7632279378365815909', {
  headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
}, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log('status:', res.statusCode, 'len:', d.length, 'hasSSR:', d.includes('_SSR_HYDRATED_DATA'), 'hasJsvm:', d.includes('_$jsvmprt')));
}).on('error', e => console.log('err:', e.message));
