####Nodejs base project utilizing express, consolidate, swig and nstore that works on Kapsi.fi members for quick project startup.

Included: 
  * [nodejs](http://nodejs.org)
  * [express](http://expressjs.com/): web application framework for node
  * [consolidate](https://github.com/visionmedia/consolidate.js):Template engine consolidation library.
  * [swig](http://paularmstrong.github.com/swig/): A Node.js and Browser-based JavaScript Template Engine
  * [nStore](https://github.com/creationix/nstore): A simple in-process key/value document store for node.js



###SETUP

1. Rename _sample.htaccess_ to _.htaccess_. 
2. Change the port number in it to match your nodejs server port.(default 306543)
3. Move the _.htaccess_ file under your public_html folder or other publicly accessible folder. 
4. The _.htaccess_ file now routes requests done to that location to your nodejs server.

5. Create data folder for nStore 
~~~
   mkdir data 
   //on project root
~~~
6. start the server: 
~~~   
   nodejs/bin/node src/server.js
~~~

7. Profit?
