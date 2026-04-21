const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:8081/api/v1/auth/login', {
      email: 'test@test.com',
      password: 'test12345'
    });
    console.log("Success", res.data);
  } catch (err) {
    if (err.response) {
      console.error("Status:", err.response.status, "Body:", err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

test();
