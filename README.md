# Proxy-web

Proxy-web is a proxy that will proxy websites in your browser. It'll proxy all resources (css, images, scripts) as well, replacing the urls with the proxy url.

## Example with express

```
import proxyWeb from 'proxy-web';
import express from 'express';

const app = express();

const proxyRoute = (req, res) => {
  console.log('Proxying', req.query.url);
  proxyWeb({
    url: req.query.url,
    method: req.method,
    headers: req.headers,
  }, {
    proxyUrl: 'http://localhost:3000/proxy?url=',
  }).then((output) => {
    res.status(output.statusCode)
       .set(output.headers)
       .send(output.body);
  });
};

app.get('/proxy', proxyRoute);
app.post('/proxy', proxyRoute);
app.put('/proxy', proxyRoute);
app.delete('/proxy', proxyRoute);

app.listen(3000, () => {
  console.log(`Listening on 3000`);
});
```

## Testing locally

```
npm run build
node lib/app.js
```

Visit `http://localhost:3000/proxy?url=http://apple.com`

## API

```
proxyWeb(request, options)
- request:
  - url: URL to proxy
  - method: HTTP method (GET, POST,...)
  - headers: HTTP headers
- options:
  - proxyUrl: your proxy's url, i.e. http://example.com/proxy?url=
```
