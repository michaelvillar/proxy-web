import url from 'url';
import request from 'request-promise-native';
import htmlparser from 'htmlparser2';
import {PORT, HOST} from './constants';

const PROXY_URL = `${HOST}/proxy?url=`;

class ProxyResource {
  constructor(req, res) {
    this.req = req;
    this.res = res;

    this.url = req.query.url;
    this.parsedUrl = url.parse(this.url);
  }

  async load() {
    return request({
      method: 'GET',
      uri: this.url,
      resolveWithFullResponse: true,
      encoding: null,
    })
  }

  async proxy() {
    let response;
    try {
      response = await this.load();
    } catch (e) {
      console.error('Error ', e.statusCode, ' for ', this.url);
      this.res.status(e.statusCode)
              .send('Not found');
      return;
    }

    const output = this.parse(response);
    this.res.set(response.headers);
    this.res.send(output);
  }

  parse(response) {
    const contentType = response.headers['content-type'];
    if (contentType.includes('text/html')) {
      return this.parseHTML(response.body.toString());
    } else if (contentType.includes('text/css')) {
      return this.parseCSS(response.body.toString());
    }
    return response.body;
  }

  parseHTML(body) {
    let output = '' + body;
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
    parser.write(body);
    parser.end();

    for (var i = 0; i < urls.length; i++) {
      const anUrl = urls[i];
      if (anUrl.indexOf('#') === 0) {
        continue;
      }

      output = output.replace(anUrl, this.resolveURL(anUrl));
    }

    return output;
  }

  parseCSS(body) {
    let output = '' + body;
    output = output.replace(/url\((.*?)\)/ig, (match, $0) => {
      if ($0.indexOf('data:') === 0) {
        return `url(${$0})`;
      }

      let href = $0.replace(/^"|'/, '');
      href = href.replace(/"|'$/, '');
      return `url(${this.resolveURL(href)})`;
    });
    return output;
  }

  resolveURL(href) {
    let resolved;
    if (href.indexOf('//') === 0) {
      resolved = `${this.parsedUrl.protocol}${href}`;
    } else {
      resolved = url.resolve(this.url, href);
    }
    return `${PROXY_URL}${encodeURIComponent(resolved)}`;
  }
}
export default ProxyResource;
