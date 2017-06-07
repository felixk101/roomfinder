const dirname = './cals/';
const fs = require('fs');
const db = require('./db.js');
const utils = require('./utils.js');
const ical = require('ical');
const fecha = require('fecha');
const parser = require('ical-date-parser');
const request = require('request');
const dateFormat = require('dateformat');


function parseCalendarFiles() {

  function roomNameFromFileName (filename) {
    return filename.slice(0, -4);
  }

  var readDirectory = function() {
    var promise = new Promise(function(resolve, reject){
      fs.readdir(dirname,(err,filenames) => {
        if(err) reject(err);
        console.log('Resolving the following filenames',filenames);
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
      var completedRooms = 0;
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
        for (var ev of events){
          //room name check
          if (room_name != ev.location) throw new Error('Room name ('+room_name+') and ' +
            'ICS location name ('+ev.location+') are not matching.');

          fecha.masks.mysqlFormat = 'YYYY-MM-DD HH:mm:SS';
          db.query('insert into bookings (room_name,event_start,event_end) values (' +
            '\'' + room_name + '\',' +
            '\''+ (fecha.format(new Date(ev.start),'mysqlFormat')) + '\','+
            '\''+ (fecha.format(new Date(ev.end),'mysqlFormat')) + '\'' +
            ');'
          , function(err, results) {
            if (err) reject(err);
          });
        }
        db.query('select count(*) as amount from bookings where room_name = '+'\'' + room_name + '\'', function(err,results) {
          if (err) reject(err);
          if (events.length != results[0].amount) {
            console.log('expected '+events.length+' but only found '+results[0].amount+' for '+room_name);
            reject('wrong number of bookings for '+room_name);
          } else {
            console.log('Added '+events.length+' bookings for '+room_name);
            completedRooms ++;
            if (completedRooms == filenames.length) resolve();
          }
        });
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
  return readDirectory()
    .then(addRooms)
    .then(addBookings);
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

//20170531
var roomID = 74;
var date = dateFormat(new Date(), 'yyyymmdd'); //today's date
var options = {
  method: 'POST',
  url: 'https://melpomene.webuntis.com/WebUntis/Timetable.do?request.preventCache=1496185210918',
  headers: {
    'Host': 'melpomene.webuntis.com',
    'User-Agent': 'Custom',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': 'https://melpomene.webuntis.com/WebUntis/?school=HS-Augsburg',
    'Connection': 'keep-alive',
    'Cookie': 'schoolname="_aHMtYXVnc2J1cmc="; JSESSIONID=3B49BD813C62C94F6BBE890790599D6C'
  },
  body: 'ajaxCommand=getWeeklyTimetable&elementType=4&elementId='+roomID+'&date='+date+'&filter.klasseId=-1&filter.klasseOrStudentgroupId=-1&filter.restypeId=-1&filter.buildingId=-1&filter.roomGroupId=-1&filter.departmentId=-1&formatId=7',
};

function callback(error, response, body) {
  if (error) throw error;

  console.log(response);
  console.log('################################################################################################################################################')
  console.log(body);
  if (!error && response.statusCode == 200) {
    var info = JSON.parse(body);
    console.log(info);
    //info.result.data.elementPeriods["74"]["0"].elements
    //type 4 (0??): room (74)
    //type 1: semester (2246) KD info.result.data.elements["12"]
    //type 2: teacher (1138) Leyendecker Sascha info.result.data.elements["5"]
    //type 3: subject or lesson (1878) Recht info.result.data.elements["11"]
    let event = info.result.data.elementPeriods[roomID][0];
    var theDay = 'On '+dateFormat(utils.parseUntisDate(event.date), "dddd, mmmm dS");
    var theTime = ' from '+event.startTime+' until '+event.endTime;
    var location =
    console.log(theDay + theTime + ':' )

    console.log(event1);

  }
}

console.log('doing request');
request(options, callback);




/*
resetDB().then(parseCalendarFiles).then(function () {
    db.query('select * from bookings',function(err,results) {
      if (err) throw err;
      console.log(results);
    });
  })
  .catch( (reason) => {
    throw(reason);
    //console.log('Handle rejected promise ('+reason+') here.');
  });
*/

//parseCalendarFiles();
//getEmptyRooms('A');

//db.end();
