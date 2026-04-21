const axios = require('axios');
async function test() {
  try {
    const login = await axios.post('http://localhost:8081/api/v1/auth/login', {
      email: 'prajjwalupadhyay15@gmail.com',
      password: 'password'
    });
    const token = login.data.accessToken;
    console.log('Token:', token ? 'VALID' : 'INVALID');
    
    // Test current
    try {
      const c = await axios.get('http://localhost:8081/api/v1/dispatch/agent/assignments/current', { headers: { Authorization: Bearer  } });
      console.log('CURRENT:', c.status);
    } catch(e) { console.log('CURRENT ERR:', e.response?.status); }

    // Test history
    try {
      const h = await axios.get('http://localhost:8081/api/v1/dispatch/agent/orders/history', { headers: { Authorization: Bearer  } });
      console.log('HISTORY:', h.status);
    } catch(e) { console.log('HISTORY ERR:', e.response?.status); }

  } catch(e) { console.log('LOG ERR', e.response?.data); }
}
test();
