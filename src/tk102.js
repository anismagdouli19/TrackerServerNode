/*
Name:         tk102
Description:  TK102 GPS server for Node.js
Source:       https://github.com/fvdm/nodejs-tk102
Feedback:     https://github.com/fvdm/nodejs-tk102/issues
License:      Unlicense / Public Domain (see UNLICENSE file)
              (https://github.com/fvdm/nodejs-tk102/raw/master/UNLICENSE)
*/


// INIT
var net = require('net')
var EventEmitter = require('events').EventEmitter

var tk102 = new EventEmitter()

// defaults
tk102.settings = {
  ip: 'lakka.kapsi.fi',
  port: 0, // 0 = random, see `listening` event
  connections: 10,
  timeout: 10
}


// device data
var specs = [

  //(027042699595BR00150202A6629.0587N02543.2464E000.41537260.000000000000L00000000)(027042699595BP00000027042699595HSO)
  //15/08/09 11:46:45:
  //(027042699595BR00150809A6637.3695N02539.1432E001.1081624215.7900000000L00000000)
  //(027042699595BP00000027042699595HSO)
  //(027042699595BR00150809A6637.3671N02539.1402E004.0081628210.4800000000L00000000)
  function(raw) {
    var result = null
    try {
        var raw = raw.trim()
        var str = raw;
        imei = str.match(/\(([0-9]*)BR/)[1];
        date = str.match(/BR([0-9]{8})[A|V]/)[1];
        time = str.match(/\E[0-9]{3,4}\..([0-9]{6})/)[1];
        gpsData = str.match(/BR[0-9]{8}(A|V)/)[1];
        lat = str.match(/[A|V]([0-9]{4,5})\.([0-9]{4})N/);
        latDegMin = lat[1];
        latSec = lat[2];
        lon = str.match(/N([0-9]{4,5})\.([0-9]{4})E/);
        lonDegMin = lon[1];
        lonSec = lon[2];
        speed = str.match(/E([0-9]{3}\.[0-9]{1})./);
        speed = parseFloat(speed[1]);
        var gpsdate = date.replace( /[0-9]{2}([0-9]{2})([0-9]{2})([0-9]{2})/, function( match, year, month, day ) {
          return day +'.'+ month +'.'+ year
        });
        var gpstime = time.replace( /([0-9]{2})([0-9]{2})([0-9]{2})/, function( match, hour, minute, second ) {
          return hour +':'+ minute +':'+ second
        });
        result = {
          'raw': raw,
          'datetime': new Date().toISOString(),
        //  'phone': str[1],
          'gps': {
            'date': gpsdate,
            'time': gpstime,
            //'signal': str[15] == 'F' ? 'full' : 'low',
            'fix': gpsData == 'A' ? 'active' : 'invalid'
          },
          'geo': {
            'latitude': tk102.fixGeo( latDegMin, latSec ),
            'longitude': tk102.fixGeo( lonDegMin, lonSec ),
            'speed': speed
            //'bearing': parseInt( str[10] )
          },
        /*  'speed': {
            'knots': Math.round( str[9] * 1000 ) / 1000,
            'kmh': Math.round( str[9] * 1.852 * 1000 ) / 1000,
            'mph': Math.round( str[9] * 1.151 * 1000 ) / 1000
          },*/
          'imei': imei.trim()
        }
    } catch(e) {
      console.log("cannot parse data: "+raw+" / " +e);
      return null;
    }
    return result
  }

  // 1203292316,0031698765432,GPRMC,211657.000,A,5213.0247,N,00516.7757,E,0.00,273.30,290312,,,A*62,F,imei:123456789012345,123
  /*function(raw) {
    var result = null
    try {
      var raw = raw.trim()
      var str = raw.split(',')

      if( str.length == 18 && str[2] == 'GPRMC' ) {
        var datetime = str[0].replace( /([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})/, function( match, year, month, day, hour, minute ) {
          return '20'+ year +'-'+ month +'-'+ day +' '+ hour +':'+ minute
        })

        var gpsdate = str[11].replace( /([0-9]{2})([0-9]{2})([0-9]{2})/, function( match, day, month, year ) {
          return '20'+ year +'-'+ month +'-'+ day
        })

        var gpstime = str[3].replace( /([0-9]{2})([0-9]{2})([0-9]{2})\.([0-9]{3})/, function( match, hour, minute, second, ms ) {
          return hour +':'+ minute +':'+ second +'.'+ ms
        })

        result = {
          'raw': raw,
          'datetime': datetime,
          'phone': str[1],
          'gps': {
            'date': gpsdate,
            'time': gpstime,
            'signal': str[15] == 'F' ? 'full' : 'low',
            'fix': str[4] == 'A' ? 'active' : 'invalid'
          },
          'geo': {
            'latitude': tk102.fixGeo( str[5], str[6] ),
            'longitude': tk102.fixGeo( str[7], str[8] ),
            'bearing': parseInt( str[10] )
          },
          'speed': {
            'knots': Math.round( str[9] * 1000 ) / 1000,
            'kmh': Math.round( str[9] * 1.852 * 1000 ) / 1000,
            'mph': Math.round( str[9] * 1.151 * 1000 ) / 1000
          },
          'imei': str[16].replace( 'imei:', '' )
        }
      }
    } catch(e) {}
    return result
  }*/
]


// Catch uncaught exceptions (server kill)
/*process.on( 'uncaughtException', function( err ) {
  console.log(err);
  var error = new Error('uncaught exception')
  error.error = err
  console.trace( error )
})*/

// Create server
tk102.createServer = function( vars ) {
  console.log("createServer")
  // override settings
  if( typeof vars == 'object' && Object.keys(vars).length >= 1 ) {
    for( var key in vars ) {
      tk102.settings[ key ] = vars[ key ]
    }
  }

  // start server
  tk102.server = net.createServer( function( socket ) {

    // socket idle timeout
    if( tk102.settings.timeout > 0 ) {
      socket.setTimeout( tk102.settings.timeout * 1000, function() {
        tk102.emit( 'timeout', socket )
        socket.end()
      })
    }

  }).listen( tk102.settings.port, tk102.settings.ip, function() {
    console.log("Tcp server listening on "+tk102.settings.port);
    // server ready
    tk102.emit( 'listening', tk102.server.address() )

  })

  // maximum number of slots
  tk102.server.maxConnections = tk102.settings.connections

  // inbound connection
  tk102.server.on( 'connection', function( socket ) {

    tk102.emit( 'connection', socket )
    socket.setEncoding('utf8')
    var data = ''

    // receiving data
    socket.on( 'data', function( chunk ) {
      console.log("chunk: "+chunk);

      var gps = null
      //gps = tk102.parse( data )
      if( chunk != '' ) {
        var gps = tk102.parse( chunk )
            if( gps ) {
              tk102.emit( 'track', gps )
            } else {
              var err = new Error('Cannot parse GPS data from device')
              err.reason = err.message
              err.socket = socket
              err.input = chunk

              tk102.emit( 'ChunkFail', err )
            }
        }


      tk102.emit( 'data', chunk )
      data += chunk
    })

    // complete
    socket.on( 'close', function() {
      //console.log("closeConn: ");
      //var d = new Date();
      //console.log(d.toLocaleString() +": "+ data);



    })

    // error
    socket.on( 'error', function( error ) {
      var err = new Error('Socket error')

      err.reason = err.message
      err.socket = socket
      err.settings = tk102.settings

      tk102.emit( 'error', err )
    })

  })

  tk102.server.on( 'error', function( error ) {
    if( error == 'EADDRNOTAVAIL' ) {
      var err = new Error('IP or port not available')
    } else {
      var err = new Error('Server error')
    }

    err.reason = err.message
    err.input = tk102.settings
    tk102.emit( 'error', err )
  })
}

// Parse GPRMC string
tk102.parse = function( raw ) {
  var data = [];
  var rawSplit = raw.split(')');
  for(var i = 0, len = rawSplit.length; i<len; i++){
        if(rawSplit[i] != ""){
            d = specs[0]( rawSplit[i] );
            if(d != null){
                data.push(d);
            }
        }
    i++;
  }
  return data;
}


// Clean geo positions, with 6 decimals
tk102.fixGeo = function( one, two ) {
  //console.log(one+" "+two);
  var minutes = one.substr(-2);
  var degrees = parseInt(one.replace( minutes, '' ), 10);
  minutes = parseFloat(minutes + "." + two);
/*  var seconds = two.substr(0,2);
  var secDecimal = two.substr(2,two.length);
  seconds = parseFloat(seconds+"."+secDecimal);*/
  var res = degrees + (minutes / 60) ;
  //console.log(res);
  return res;

}

// ready
module.exports = tk102
