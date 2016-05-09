
'use strict';

const Hapi = require('hapi');

const server = new Hapi.Server();
server.connection({ port: 3000 });

// server.route({
//     method: 'GET',
//     path: '/helloworld',
//     handler: function (request, reply) {
//         reply('Hello, world!');
//     }
// });

// server.route({
//     method: 'GET',
//     path: '/helloworldagain',
//     handler: function (request, reply) {
//         reply('Hello, world! again !');
//     }
// });

// server.route({
//     method:'GET',
//     path:'/test/again',
//     handler:function(request, reply) {
//         server.log('info',"YESS!!!");
//         reply("hello from test in a remote editor and this is with distant node restart from iphone !! ");
//     }
// });


server.register([{
    register: require('good'),
    options: {
        reporters: [{
            reporter: require('good-console'),
            events: {
                response: '*',
                log: '*'
            }
        }]
    }
}, {
  register : require('inert'),
  options : {
    
  }
}], (err) => {

  if (err) {
      throw err; // something bad happened loading the plugin
  }
  server.route({
    method: 'GET',
    path: '/public/{param*}',
    handler: {
        directory: {
            path: 'public',
            listing: false,
            index:['index.html']
        }
    }
});


server.start((err) => {

    if (err) {
        throw err;
    }
    server.log('info', 'Server running at:'+ server.info.uri);
  });
});


