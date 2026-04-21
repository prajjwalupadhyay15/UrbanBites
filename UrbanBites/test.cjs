const axios = require('axios');
const http = require('http');

async function test() {
  try {
    const login = await axios.post('http://localhost:8081/api/v1/auth/login', {
      email: 'agent1@urbanbites.com',
      password: 'password'
    });
    const token = login.data.token;
    console.log('Got token:', token.substring(0, 20) + '...');
    
    // test /current
    try {
      const current = await axios.get('http://localhost:8081/api/v1/dispatch/agent/assignments/current', {
        headers: { Authorization: Bearer  }
      });
      console.log('/current SUCCESS', current.data);
    } catch (e) {
      console.log('/current ERROR:', e.response?.status, e.response?.data);
    }

    // test /details
    try {
      const details = await axios.get('http://localhost:8081/api/v1/dispatch/agent/assignments/current/details', {
        headers: { Authorization: Bearer  }
      });
      console.log('/details SUCCESS', details.data);
    } catch (e) {
      console.log('/details ERROR:', e.response?.status, e.response?.data);
    }

    // test /history
    try {
      const history = await axios.get('http://localhost:8081/api/v1/dispatch/agent/orders/history', {
        headers: { Authorization: Bearer  }
      });
      console.log('/history SUCCESS', history.data);
    } catch (e) {
      console.log('/history ERROR:', e.response?.status, e.response?.data);
    }
  } catch (err) {
    console.error('Login failed', err.message);
  }
}
test();
