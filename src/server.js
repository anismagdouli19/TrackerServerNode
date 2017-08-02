express = require('express');
var app = express();
app.use(express.logger());
app.use(express.static(__dirname+'/public'));
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
//var nstore = require('nstore');
var cons = require('consolidate');

var swig = require('swig');
swig.init({ root: __dirname + '/templates', allowErrors: true });
Moment  = require('moment-timezone');
Moment.locale('fz');


//settings
var config = require('./config').config;


var mysql      = require('mysql');
var connection = mysql.createConnection({
	host     :  config.dbHost,
	user     :  config.dbUser,
	database :  config.dbName,
	password :  config.dbPassword,
	dateStrings: true
});

var clearDbForImei = function(imei){
	var KEEP = 50;
	var sql = "DELETE FROM point\
	WHERE device_id=? AND id <= (\
		SELECT id\
		FROM (\
			SELECT id\
			FROM point\
			WHERE device_id=?\
			ORDER BY created DESC\
			LIMIT 1 OFFSET ? \
		) foo\
	)";

	var inserts = [imei, imei, KEEP];
	sql = mysql.format(sql, inserts);
	connection.query(sql, function(err, rows) {
		if(err){
			console.log(err);
		}
		console.log(rows.length);
	});
}

var savePointToDb = function(imei, latitude, longitude, speed, gpsDatetime, callback){
	var sql = "INSERT INTO point (device_id, lat, lon,speed, gps_datetime ) VALUES (?,?,?,?,? )";
	var inserts = [
					imei,
					latitude,
					longitude,
					speed,
					gpsDatetime
				  ];
	sql = mysql.format(sql, inserts);
	connection.query(sql,callback);
};

var saveToRaw = function(rawString, callback){
	var sql = "INSERT INTO test (data) VALUES (?)";
	var inserts2 = [rawString];
	sql = mysql.format(sql, inserts2);
	connection.query(sql,callback);
};

var schedule = require('node-schedule');
var rule = new schedule.RecurrenceRule();

var rule = new schedule.RecurrenceRule();
rule.minute = [0, new schedule.Range(1, 60, 10)];
var j = schedule.scheduleJob(rule, function(){
	//console.log( Moment.format("YY/MM/DD h:mm:ss") +": clearing DB of old points");
	var sql = "SELECT imei FROM device;";
	connection.query(sql, function(err, rows) {
		if(err){
			console.log(err);
		}
		for(var i=0, len = rows.length; i<len;i++){
			clearDbForImei(rows[i].imei)
		}
	});
});


app.engine('html', cons.swig);
app.set('view engine','html');
app.set('views',__dirname+ '/templates');

app.get('/', function(req, res){

	var sql = "SELECT lat, lon, speed, created FROM point WHERE device_id=?;";
	var inserts = ['867965023220144'];
	sql = mysql.format(sql, inserts);

	connection.query(sql, function(err, rows) {
		if(err){
			console.log(err);
		}
		res.render('index',{imei: '867965023220144',data:rows, last:rows[rows.length - 1]});
	});

});

app.post('/:imei/save-point', function(req, res){
	var nowUtc = Moment().tz("utc");
	var lat = req.param('lat', null);
	var lon = req.param('lon', null);
	var date = nowUtc.format("YYYY-MM-DD HH:mm:ss");

	savePointToDb(
		'867965023220144',
		lat,
		lon,
		0,
		date,
		function(err, rows){
			if(err){
				console.log(err);
			}
			res.json(rows);
		});
});

app.get('/:imei/path', function(req, res){
	var imei = req.params.imei
	console.log(imei+"/path?date="+req.query.date);
	var sql = "SELECT lat, lon, speed, gps_datetime FROM point WHERE device_id=? ORDER BY gps_datetime ASC;";
	var inserts = [imei];
	var q=req.query.date
	if(q !== undefined){
		sql = "SELECT lat, lon, speed, gps_datetime FROM point WHERE device_id=? AND gps_datetime > ? ORDER BY gps_datetime ASC;";
		inserts.push(q);
	}

	sql = mysql.format(sql, inserts);
	connection.query(sql, function(err, rows) {
		if(err){
			console.log(err);
		}
		var numbers = [1, 4, 9];
		var rows2 = rows.map(function(obj) {
			obj.created = Moment.tz(obj.gps_datetime, "utc").format("YYYY-MM-DD HH:mm:ss");
			var now = Moment().tz("utc")
			var dbDate = Moment.tz(obj.gps_datetime, "utc");
			obj.since = dbDate.from(now);
			return obj;
		});
		res.json(rows2);
	});

});




//Socket server

var port = 306542;
app.listen(port);
console.log("Express listening on "+port);

var server = require('./tk102')

// start server
server.createServer({
	port: 62433
})

// incoming data
server.on( 'track', function( gps ) {
	for(var i = 0, len = gps.length; i<len; i++){
		//console.log( "incoming data: "+new Moment().format("YY/MM/DD h:mm:ss") +": "+ gps[i].raw );
		console.log(gps);
		if(gps[i].gps.fix == "active"){

			savePointToDb(
					gps[i].imei,
					gps[i].geo.latitude,
					gps[i].geo.longitude,
					gps[i].geo.speed,
					gps[i].gps.dateTime,
					function(err, rows){
						if(err){
							console.log(err);
						}
						saveToRaw(JSON.stringify(gps), function(err, rows){
							if(err){
								console.log(err);
							}
						});
					});
		} else{
			console.log("no fix.");
		}
	}
	return;
})

server.on( 'error', function( error ) {
	console.log( "Socket Error." );
	console.log(error);
})

server.on( 'fail', function( error ) {
	console.log( "parse fail." );
})
