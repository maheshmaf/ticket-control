let Hapi = require('@hapi/hapi');
let mongoose = require('mongoose');
let RestHapi = require('rest-hapi');

async function api() {
  try {
    let server = Hapi.Server({
      port: 8080,
      routes: {
        validate: {
          failAction: async (request, h, err) => {
            RestHapi.logger.error(err);
            throw err;
          },
        },
      },
    });

    let config = {
      appTitle: 'Theater Ticket Control Panel',
      enableTextSearch: true,
      logRoutes: true,
      docExpansion: 'list',
      swaggerHost: 'localhost:8080',
      mongo: {
        URI: 'mongodb://localhost:27017/theater',
      },
      enableAuditLog: false,
    };

    await server.register({
      plugin: RestHapi,
      options: {
        mongoose: mongoose,
        config: config,
      },
    });

    await server.register({
      plugin: require('hapi-auth-basic'),
    });

    const basicValidation = async function (request) {
      if (request?.headers?.authorization === 'secret') {
        return { isValid: true };
      }
      return { isValid: false };
    };

    server.auth.strategy('myAuth', 'basic', { validate: basicValidation });
    server.auth.default('myAuth');

    await server.start();

    RestHapi.logUtil.logActionComplete(RestHapi.logger, 'Server Initialized', server.info);

    return server;
  } catch (err) {
    console.log('Error starting server:', err);
  }
}

module.exports = api();
