const axios = require('axios');
async function test() {
  try {
    const r = await axios.post('http://localhost:8081/api/v1/auth/register', {
      fullName: 'Agent Test', email: 'agent3@urbanbites.com', password: 'password', role: 'DELIVERY_AGENT'
    });
    const t = r.data.accessToken;
    console.log('Token:', t.substring(0,20)+'...');
    
    // Test current
    try {
      const c = await axios.get('http://localhost:8081/api/v1/dispatch/agent/assignments/current', { headers: { Authorization: Bearer  } });
      console.log('CURRENT:', c.status);
    } catch(e) { console.log('CURRENT ERR:', e.response?.status); }

    // Test history
    try {
      const h = await axios.get('http://localhost:8081/api/v1/dispatch/agent/orders/history', { headers: { Authorization: Bearer  } });
      console.log('HISTORY:', h.status);
    } catch(e) { console.log('HISTORY ERR:', e.response?.status, e.response?.data); }

  } catch(e) { console.log('REG ERR', e.response?.data); }
}
test();
