import http from 'http';
const s = http.createServer();
s.listen(3003, () => console.log('Listening HTTP'));
