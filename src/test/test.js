
var should = require('chai').should();
var tk102 = require('../tk102')

describe("testTK102", function() {
   describe("parse single data", function() {
       it("should parse string", function(){
           
       		var testString = "(027042699595BR00150809A6637.3671N02539.1402E004.0081628210.4800000000L00000000)"

       		var res = tk102.parse(testString);

       		res.should.be.a('array')
       		res.length.should.equal(1);
       		res[0].gps.time.should.equal('08:16:28');
       		res[0].gps.date.should.equal('09.08.15');
       		res[0].geo.latitude.should.equal(66.622785);
       		res[0].geo.longitude.should.equal( 25.652336666666667);

       });

       it("should parse multiple item string", function(){
           
       		var testString = "(027042699595BR00150809A6637.3695N02539.1432E001.1081624215.7900000000L00000000)(027042699595BP00000027042699595HSO)"

       		var res = tk102.parse(testString);

       		res.should.be.a('array')
       		res.length.should.equal(1);
       		res[0].gps.time.should.equal('08:16:24');
       		res[0].gps.date.should.equal('09.08.15');
       		res[0].geo.latitude.should.equal(66.622825);
       		res[0].geo.longitude.should.equal(25.652386666666665);

       });

   });

       

});