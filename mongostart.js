let bluebird = require('bluebird');
mongodb = bluebird.promisifyAll(require('mongodb'));
let dateFormat = require('dateformat')
let request = require('request-promise');
let roomlist = require('./untisMappings/roomMappings.json');
let url = 'mongodb://roomfinder:secretpw@localhost:27017/hsa';
let db;

process.stdout.write('Establishing database connection... ');

mongodb.MongoClient.connectAsync(url)

  .then(function (database) {
    console.log('Connected.')
    db = database;
    //check if rooms already inserted
    return db.collection('rooms').findOne({name: 'M1.01'});
  })
  .then (function (result) {
    //if not, insert them
    result === null
      ? db.collection('rooms').insertManyAsync(roomlist)
      : Promise.resolve()
  })
  .then (function() {
    console.log('Checking time since last update.');
    return db.collection('rooms').findOne({_id: 'meta'});
  })
  .then (function(result) {
    if (result == null) {
      console.log('missing update time')
      return db.collection('rooms').insertOne({_id:'meta',lastUpdate:new Date()});
    } else if (new Date() - result.lastUpdate > 699*3600*1000) {
      console.log('Last update is more than six hours old, updating...');
      return db.collection('rooms').find({type: 4});
      //do request here?? but different kinds of results for different if paths...
    } else {
      console.log('everything is up to date, now what?')
    }
  })
  .then (function(cursor) {
    //TODO check if meta was just updated(?)
    // cursor.each(function(room) {
    //
    // });
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
      body: 'ajaxCommand=getWeeklyTimetable' +
      '&elementType=4' +
      '&elementId='+roomID+'' +
      '&date='+date+'' +
      '&filter.klasseId=-1' +
      '&filter.klasseOrStudentgroupId=-1' +
      '&filter.restypeId=-1' +
      '&filter.buildingId=-1' +
      '&filter.roomGroupId=-1' +
      '&filter.departmentId=-1' +
      '&formatId=7',
    };
    return request(options);
  })
  .then (function(result) {
    let data = JSON.parse(result)['result']['data'];

    for (elementPeriod of data['elementPeriods']['74']) {
      console.log('date: '+elementPeriod.date);
      console.log('start: '+elementPeriod.startTime);
      console.log('end: '+elementPeriod.endTime);
      //console.log('semester:'+data.elements.find(element => {return element.id == elementPeriod.elements[0].id} ).name);
      console.log('room:'   +data.elements.find(element => {return element.id == elementPeriod.elements[3].id} ).name);
      console.log('subject:'+data.elements.find(element => {return element.id == elementPeriod.elements[2].id} ).name);
      console.log('teacher:'+data.elements.find(element => {return element.id == elementPeriod.elements[1].id} ).name);
    }

    console.log(data);

  })
  .catch (function (err) {
    throw err;
  });



