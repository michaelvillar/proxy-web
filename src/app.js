import express from 'express';
import proxyWeb from './proxy_web';

const PORT = 3000;
const app = express();

const proxyRoute = (req, res) => {
  try {
    console.log('Proxying', req.query.url);
    proxyWeb({
      url: req.query.url,
      method: req.method,
      headers: req.headers,
    }, {
      proxyUrl: `http://localhost:${PORT}/proxy?url=`,
    }).then((output) => {
      res.status(output.statusCode)
         .set(output.headers)
         .send(output.body);
    });
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
