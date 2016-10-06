import ProxyResource from './proxy_resource';

const proxyWeb = (req, options) => {
  const resource = new ProxyResource(req, options)
  return resource.proxy();
};

export default proxyWeb;
