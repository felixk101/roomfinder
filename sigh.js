const db = require('./db.js');
db.query('SELECT 1 + 1 AS solution', function (err,results) {
  if (err) throw err;
  console.log(results);
  db.end();
});


