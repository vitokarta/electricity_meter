const bcrypt = require('bcrypt');

async function generateHash() {
  const plainPassword = '123456789'; // 這裡填入您想要的實際密碼
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(plainPassword, salt);
  console.log('Hashed password:', hash);
}

generateHash();