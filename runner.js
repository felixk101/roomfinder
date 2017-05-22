const dirname = './cals/';
const fs = require('fs');
const db = require('./db.js');
const ical = require('ical');
const fecha = require('fecha');
const parser = require('ical-date-parser');


function parseCalendarFiles() {

  function roomNameFromFileName (filename) {
    return filename.slice(0, -4);
  }

  var readDirectory = function() {
    var promise = new Promise(function(resolve, reject){
      fs.readdir(dirname,(err,filenames) => {
        if(err) reject(err);
        console.log('resolving the following filenames',filenames);
        resolve(filenames);
      });
    });
    return promise;
  };

  var addRooms = function(filenames) {
    var promise = new Promise(function(resolve, reject){
      var successfulQueries = 0;
      var roomNames =[];
      filenames.forEach(filename => {
        var room_name = roomNameFromFileName(filename);
        db.query('insert into rooms (room_name,building,floor) values (\'' +
            room_name + '\', \'' +
            room_name.slice(0, 1) + '\', ' +
            room_name.slice(1, 2) + ');',
          function(err,results) {
            if (err) reject(err);
            successfulQueries ++;
            if (successfulQueries == filenames.length) {
              console.log('Added rooms to database.')
              resolve(filenames);
            }
          }
        );
      });
    });
    return promise;
  };

  //warning - filenames all end in .ics; they are not roomnumbers
  var addBookings = function(filenames) {
    var promise = new Promise(function(resolve, reject){
      var successfulRoomQueries = 0;
      filenames.forEach(filename => {
        var room_name = roomNameFromFileName(filename);

        var successfulEventsetQueries = 0;

        var data = ical.parseFile(dirname + filename);
        var events = [];
        for (var k in data) {
          if (data.hasOwnProperty(k)) {
            events.push(data[k]);
          }
        }
        console.log('Adding '+events.length+' bookings for '+room_name);
        for (var ev of events){
          console.log('entering ev: ',ev)
          //room name check
          if (room_name != ev.location) throw new Error('Room name ('+room_name+') and ' +
            'ICS location name ('+ev.location+') are not matching.');

          fecha.masks.mysqlFormat = 'YYYY-MM-DD HH:mm:SS';
          db.query('insert into bookings (room_name,event_start,event_end) values (' +
            '\'' + room_name + '\',' +
            '\''+ (fecha.format(new Date(ev.start),'mysqlFormat')) + '\','+
            '\''+ (fecha.format(new Date(ev.end),'mysqlFormat')) + '\'' +
            ');'
          ), function(err, results) {
            if (err) throw err;
            console.log(results[0].keys);
          };
        }
        db.query('select count(*) from bookings where room_name = '+'\'' + room_name + '\''), function(err,results) {
          if (err) reject(err);
          if (events.length != results[0]) {
            reject('wrong number of bookings for '+room_name);
          }
        }

      });

    });
    return promise;
  }

  /*
  fs.readdir(dirname, (err,filenames) => {
    if (err) throw err;
    filenames.forEach(filename => {
      var room_name = filename.slice(0, -4);
      //filenames are room names -> insert these into the table of rooms
      db.query('insert into rooms (room_name,building,floor) values (\'' +
        room_name + '\', \''+
        room_name.slice(0,1)+'\', ' +
        room_name.slice(1,2)+');' //hopefully this really is an integer
      );

      var eventSet = ical.parseFile(dirname + filename);
      for (event in eventSet) {
        fecha.masks.mysqlFormat = 'YYYY-MM-DD HH:mm:SS';
        db.query('insert into bookings (room_name,event_start,event_end) values (' +
          '\'' + room_name + '\',' +
          '\''+ (fecha.format(new Date(eventSet[event].start),'mysqlFormat')) + '\','+
          '\''+ (fecha.format(new Date(eventSet[event].end),'mysqlFormat')) + '\'' +
          ');'
        );
      }
    });
  });
  */
  return readDirectory().then(addRooms).then(addBookings);
}

function getEmptyRooms(building, floor) {
  let otherConditions = '';
  otherConditions += building? ' AND building =\''+building+'\' ' : '';
  otherConditions += floor? ' AND FLOOR = \''+floor+'\' ' : '';
  db.query('select room_name from rooms;');
  db.query('' +
    'SELECT DISTINCT room_name ' +
    'FROM rooms ' +
    'WHERE NOT EXISTS (' +
      'SELECT * ' +
      'FROM bookings ' +
      'WHERE now() between event_start and event_end' +
    ') '+otherConditions+';',true,
    function(err,results) {
      if (err) throw err;
      let rooms;
      results.forEach(row => {
       rooms.push(row.room_name);
      });
      console.log(rooms);

  });

}

function getRoomInfo(building, floor) {

}

function resetDB() {

  var dropTables = function() {
    let successfulQueries=0;

    var promise = new Promise(function(resolve, reject){
      let finish = function(err,results) {
        if (err) reject(err);
        successfulQueries ++;
        if (successfulQueries == 4) {
          console.log('All tables dropped')
          resolve(successfulQueries);
        }
      };
      db.query('drop table IF EXISTS bookings;',finish);
      db.query('drop table IF EXISTS events;',finish);
      db.query('drop table IF EXISTS rooms;',finish);
      db.query('drop table IF EXISTS buildings;',finish);
    });

    return promise;
  };
  var createTables = function(someStuff) {
    let successfulQueries=0;

    var promise = new Promise(function(resolve, reject){
      let finish = function(err,results) {
        if (err) reject(err);
        successfulQueries ++;
        if (successfulQueries == 2) {
          console.log('All tables recreated.')
          resolve();
        }
      };
      db.query('create table rooms ( ' +
        'room_name varchar(20) NOT NULL, ' +
        'building varchar(3) NOT NULL, ' +
        'floor tinyint NOT NULL, ' +
        'PRIMARY KEY (room_name));',finish);
      db.query('create table bookings ( ' +
        'room_name varchar(256) NOT NULL, ' +
        'event_start datetime NOT NULL, ' +
        'event_end datetime NOT NULL, ' +
        'FOREIGN KEY (room_name) REFERENCES rooms(room_name));',finish);
    });
    return promise;
  };
  return dropTables().then(createTables);
}

resetDB()
  .then(parseCalendarFiles)
  .then(function () {
    db.query('select * from bookings',function(err,results) {
      if (err) throw err;
      console.log(results);
    })
  })
  .catch( (reason) => {
    throw(reason);
    //console.log('Handle rejected promise ('+reason+') here.');
  });

//parseCalendarFiles();
//getEmptyRooms('A');

//db.end();
