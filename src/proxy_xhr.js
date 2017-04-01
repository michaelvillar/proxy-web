var baseURL = '$0';
var oldXHROpen = window.XMLHttpRequest.prototype.open;
window.XMLHttpRequest.prototype.open = function(method, url) {
  var args = arguments;
  if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) {
    args[1] = baseURL + encodeURIComponent(url);
  }
  oldXHROpen.apply(this, args);
};
