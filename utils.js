exports.parseUntisDate = function (str) {
  var y = str.substr(0,4),
    m = str.substr(4,2),
    d = str.substr(6,2);
  var D = new Date(y,m,d);
  if (D.getFullYear() == y && D.getMonth() == m && D.getDate() == d)
    return D;
  else
    throw new Error('Invalid Date');
};
