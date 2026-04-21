const axios = require('axios');
async function test() {
  try {
    const r = await axios.post('http://localhost:8081/api/v1/auth/login', {
      email: 'agent3@urbanbites.com', password: 'password'
    });
    const t = r.data.accessToken;
    
    try {
      await axios.get('http://localhost:8081/api/v1/dispatch/agent/orders/history', { headers: { Authorization: Bearer  } });
    } catch(e) { console.log(e.message, e.response?.status, e.response?.data); }

  } catch(e) { console.log('LOG ERR', e.response?.data); }
}
test();
