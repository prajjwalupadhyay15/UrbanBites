const axios = require('axios');
async function test() {
  try {
    const r = await axios.post('http://localhost:8081/api/v1/auth/login', {
      email: 'prajjwalupadhyay@gmail.com', password: 'password'
    });
    const t = r.data.accessToken;
    
    try {
      const h = await axios.get('http://localhost:8081/api/v1/dispatch/agent/DOESNOTEXIST', { headers: { Authorization: Bearer  } });
      console.log('STATUS:', h.status);
    } catch(e) { console.log('ERR:', e.response?.status, e.response?.data); }

  } catch(e) { console.log('LOG ERR', e.response?.data); }
}
test();
