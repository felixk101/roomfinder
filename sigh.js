const db = require('./db.js').connect();
console.log('db:',db);
db.query('SELECT 1 + 1 AS solution', function (err,results) {
  if (err) throw err;
  console.log(results);
});
