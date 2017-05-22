var mysql      = require('promise-mysql');
var connection;
//'SELECT 1 + 1 AS solution'


exports.connect = function () {

  mysql.createConnection({
    host     : 'localhost',
    user     : 'roomfinder',
    password : 'secret',
    database : 'hsa'
  }).then(function(conn) {
    connection = conn;
    console.log('Connected to MYSQL DB on '+conn.config.host);
    console.log('connection = '+connection);
    return connection;
  }).catch(function(err) {
    throw(err);
  });
};

exports.query = function (sqlString, callback)
{
  console.log('querys connection = '+connection);
  callback = callback || function(err,results) {
    if (err) throw err;
    console.log(results);
  };
  connection.then(function (nothing_WTF_IDONTKNOW) {
    console.log('nothing_WTF = ',nothing_WTF_IDONTKNOW);
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
      return('Error executing:',sqlString, error.toString().split('\n')[0]);
      //throw error;
    }

    if (verbose && results) {
      console.log(sqlString);
      if (results.hasOwnProperty('affectedRows')) {
        console.log('  '+(results.affectedRows) + ' rows affected.');
      } else {
        console.log(' ',results);
      }
    }
    */

}
exports.end = function ()
{
  connection.end();
  console.log('DB connection severed!')
}

