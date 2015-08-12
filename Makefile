REPORTER = dot

test_r:
	nodejs/bin/node node_modules/.bin/mocha --reporters

test:
	nodejs/bin/node node_modules/.bin/mocha --reporter $(REPORTER) src/test/

.PHONY: test 
