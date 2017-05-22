var mysql      = require('promise-mysql');
var instance;
var connection;
//'SELECT 1 + 1 AS solution'


instance = mysql.createConnection({
  host: 'localhost',
  user: 'roomfinder',
  password: 'secret',
  database: 'hsa'
}).then(function (conn) {
  connection = conn;
}).catch(function(err) {
  throw(err);
});


exports.query = function (sqlString, callback)
{
  callback = callback || function(err,results) {
    if (err) throw err;
    //console.log('"'+sqlString+'" => \n',results);
  };

  instance.then(function () {
    return connection.query(sqlString);
  }).then(function (results) {
    callback(null, results);
  }).catch(function(err) {
    callback(err);
  });

  //connection.query(sqlString, callback);
    //function (error, results, fields
    /*

    if (typeof callback === 'function') {
      callback(error,results);
      return;
    }
    if (error) {
      return('Error executing:',sqlString,
      error.toString().split('\n')[0]);
      //throw error;
    }

    if (verbose && results) {
      console.log(sqlString);
      if (results.hasOwnProperty('affectedRows')) {
        console.log('  '+(results.affectedRows)
        + ' rows affected.');
      } else {
        console.log(' ',results);
      }
    }
    */

}
exports.end = function () {
  connection.end();
  console.log('DB connection severed!')
}


