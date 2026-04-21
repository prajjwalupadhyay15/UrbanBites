const axios = require('axios');
async function test() {
  try {
    const login = await axios.post('http://localhost:8081/api/v1/auth/login', {
      email: 'agent1@urbanbites.com',
      password: 'password'
    });
    const token = login.data.accessToken;
    
    const h = await axios.get('http://localhost:8081/api/v1/dispatch/agent/orders/history', { headers: { Authorization: Bearer  } });
    console.log('HISTORY COUNT:', h.data.length);
    console.log('HISTORY DATA:', h.data);
    
    const f = await axios.get('http://localhost:8081/api/v1/dispatch/agent/finance/summary', { headers: { Authorization: Bearer  } });
    console.log('FINANCE SUMMARY:', f.data);

  } catch(e) { console.log('LOG ERR', e.response?.data); }
}
test();
