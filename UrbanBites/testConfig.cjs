const axios = require('axios');
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end(JSON.stringify(req.headers));
});
server.listen(8083, async () => {
  const apiClient = axios.create({ baseURL: 'http://localhost:8083' });
  apiClient.interceptors.request.use(config => {
    config.headers.Authorization = 'Bearer test';
    return config;
  });
  
  const SKIP_AUTH = { _skipAuthRedirect: true };
  const r1 = await apiClient.get('/one', SKIP_AUTH);
  const r2 = await apiClient.get('/two', SKIP_AUTH);
  
  console.log(r1.data.authorization, r2.data.authorization);
  server.close();
});
