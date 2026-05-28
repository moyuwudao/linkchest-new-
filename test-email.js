const { sendVerificationCode } = require('./project/apps/api/dist/services/ses.js');

sendVerificationCode('test@example.com', '123456')
  .then(r => console.log('Success:', r))
  .catch(e => console.error('Error:', e.message));
