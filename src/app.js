import 'babel-polyfill';
import express from 'express';
import ProxyResource from './proxy_resource';
import {PORT} from './constants';

const app = express();

const proxyRoute = (req, res) => {
  try {
    const resource = new ProxyResource(req, res)
    console.log('Proxying', resource.url);
    resource.proxy();
  } catch (e) {
    console.error(e.stack);
  }
};

app.get('/proxy', proxyRoute);
app.post('/proxy', proxyRoute);
app.put('/proxy', proxyRoute);
app.delete('/proxy', proxyRoute);

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});
