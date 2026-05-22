const { translate } = require('bing-translate-api');

async function main() {
  try {
    const result = await translate('Hello world', 'en', 'ko');
    console.log('KO:', result.translation);
  } catch (e) {
    console.error('KO error:', e.message);
  }
  try {
    const result = await translate('Hello world', 'en', 'fr');
    console.log('FR:', result.translation);
  } catch (e) {
    console.error('FR error:', e.message);
  }
  try {
    const result = await translate('Hello world', 'en', 'de');
    console.log('DE:', result.translation);
  } catch (e) {
    console.error('DE error:', e.message);
  }
}
main();
