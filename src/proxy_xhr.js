var baseURL = '$0';
var oldXHROpen = window.XMLHttpRequest.prototype.open;
window.XMLHttpRequest.prototype.open = function(method, url) {
  var args = arguments;
  args[1] = baseURL + encodeURIComponent(url);
  oldXHROpen.apply(this, args);
};
