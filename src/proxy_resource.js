import toolsUrl from 'url';
import request from 'request-promise-native';
import htmlparser from 'htmlparser2';
import _ from 'lodash';
import ent from 'ent';
import zlib from 'zlib';
import escapeStringRegexp from 'escape-string-regexp';
import fs from 'fs';

const NOT_PROXIED_SCHEMES = ['#', 'data:', 'about:'];

class ProxyResource {
  constructor(req, options) {
    this.req = req;
    this.proxyURL = options.proxyUrl;

    this.url = req.url;
    this.parsedUrl = toolsUrl.parse(this.url);
    this.host = `${this.parsedUrl.protocol}//${this.parsedUrl.host}`;
  }

  async load() {
    let headers = this.req.headers;
    headers.host = this.parsedUrl.host;
    headers.referer = `${this.host}/`;
    delete headers['accept-encoding'];
    return request({
      method: this.req.method,
      uri: this.url,
      resolveWithFullResponse: true,
      encoding: null,
      gzip: true,
      headers: headers,
      timeout: 2000,
    });
  }

  async proxy() {
    return new Promise(async (resolve, reject) => {
      let response;
      try {
        response = await this.load();
      } catch (e) {
        if (e.error && !e.statusCode) {
          console.error(e.error.toString ? e.error.toString('utf8') : e.error);
        }

        let output = {
          statusCode: e.statusCode || 500,
        };
        if (e.response) {
          output = {
            ...output,
            headers: this.filterResponseHeaders(e.response.headers),
            body: this.parse(e.response),
          };
        }

        return resolve(output);
      }

      resolve({
        statusCode: response.statusCode,
        headers: this.filterResponseHeaders(response.headers),
        body: this.parse(response),
      });
    });
  }

  filterResponseHeaders(headers) {
    return _.omit(headers, 'x-frame-options', 'content-encoding');
  }

  parse(response) {
    const contentType = response.headers['content-type'] || '';
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
    const urlAttrs = ['href', 'src'];

    const parser = new htmlparser.Parser({
      onopentag: (name, attrs) => {
        for (const urlAttr of urlAttrs) {
          if (attrs[urlAttr]) {
            urls.push(attrs[urlAttr].trim());
          }
        }
      },
    }, {decodeEntities: false});
    parser.write(body);
    parser.end();

    const matches = [];
    for (const urlAttr of urlAttrs) {
      matches.push(`${urlAttr}="$0"`);
      matches.push(`${urlAttr}='$0'`);
      matches.push(`${urlAttr}=$0`);
    }

    for (const url of urls) {
      let continueLoop;
      for (const scheme of NOT_PROXIED_SCHEMES) {
        if (url.indexOf(scheme) === 0) {
          continueLoop = true;
          break;
        }
      }

      if (continueLoop) {
        continue;
      }

      const newUrl = this.resolveURL(ent.decode(url));

      for (const match of matches) {
        const regexp = new RegExp(escapeStringRegexp(match.replace('$0', url)), 'g');
        output = output.replace(regexp, match.replace('$0', newUrl));
      }
    }

    let proxyXHR = fs.readFileSync(`${__dirname}/proxy_xhr.js`).toString();
    proxyXHR = proxyXHR.replace('$0', this.resolveURL('/'));
    proxyXHR = proxyXHR.replace("'use strict';", '');
    output = `
    <script>
    ${proxyXHR}
    </script>
    ${output}
    `;

    return output;
  }

  parseCSS(body) {
    let output = '' + body;
    output = output.replace(/url\((.*?)\)/ig, (match, $0) => {
      let url = $0.trim().replace(/^"|'/, '');
      url = url.replace(/"|'$/, '');

      if (url.indexOf('data:') === 0) {
        return `url(${$0})`;
      }

      return `url(${this.resolveURL(url)})`;
    });
    return output;
  }

  resolveURL(url) {
    let resolved;
    if (url.indexOf('//') === 0) {
      resolved = `${this.parsedUrl.protocol}${url}`;
    } else {
      resolved = toolsUrl.resolve(this.url, url);
    }
    return `${this.proxyURL}${encodeURIComponent(resolved)}`;
  }
}

export default ProxyResource;
