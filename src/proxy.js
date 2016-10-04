import 'babel-polyfill';
import express from 'express';
import url from 'url';
import request from 'request-promise-native';
import htmlparser from 'htmlparser2';

const app = express();
const port = 3000;

app.get('/proxy', async (req, res) => {
  try {
    const queriedUrl = req.query.url;
    console.log(queriedUrl);
    const queriedParsedUrl = url.parse(queriedUrl);
    const queriedHost = `${queriedParsedUrl.protocol}//${queriedParsedUrl.host}`;
    const newHost = `http://localhost:${port}/proxy?url=`;

    let response;
    try {
      response = await request({
        method: 'GET',
        uri: queriedUrl,
        resolveWithFullResponse: true,
        encoding: null,
      });
    } catch (e) {
      console.error('Error ', e.statusCode, ' for ', queriedUrl);
      res.status(e.statusCode)
         .send('Not found');
      return;
    }

    function resolve(href) {
      let resolved;
      if (href.indexOf('//') === 0) {
        resolved = `${queriedParsedUrl.protocol}${href}`;
      } else {
        resolved = url.resolve(queriedUrl, href);
      }
      return `${newHost}${encodeURIComponent(resolved)}`;
    }

    let output;
    if (response.headers['content-type'].includes('text/html')) {
      output = response.body.toString();

      let urls = [];

      const parser = new htmlparser.Parser({
        onopentag: (name, attrs) => {
          const href = attrs.href;
          if (href) {
            urls.push(href);
          }

          const src = attrs.src;
          if (src) {
            urls.push(src);
          }
        },
      }, {decodeEntities: true});
      parser.write(output);
      parser.end();

      for (var i = 0; i < urls.length; i++) {
        const anUrl = urls[i];
        if (anUrl.indexOf('#') === 0) {
          continue;
        }

        output = output.replace(anUrl, resolve(anUrl));
      }
    } else if (response.headers['content-type'].includes('text/css')) {
      output = response.body.toString();
      output = output.replace(/url\((.*?)\)/ig, (match, $0) => {
        if ($0.indexOf('data:') === 0) {
          return `url(${$0})`;
        }

        let href = $0.replace(/^"|'/, '');
        href = href.replace(/"|'$/, '');
        return `url(${resolve(href)})`;
      });
    } else {
      output = response.body;
    }

    res.set(response.headers);
    res.send(output);
  } catch(e) {
    console.error(e);
  }
});

app.listen(port, () => {
  console.log(`Listening on ${port}`);
});
