import 'babel-polyfill';
import express from 'express';
import ProxyResource from './proxy_resource';
import {PORT} from './constants';

const app = express();

app.get('/proxy', (req, res) => {
  try {
    const resource = new ProxyResource(req, res)
    console.log('Proxying', resource.url);
    resource.proxy();
  } catch (e) {
    console.error(e.stack);
  }
});

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});
