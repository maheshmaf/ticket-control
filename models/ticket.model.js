const RestHapi = require('rest-hapi');
const moment = require('moment');

const monthsArray = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

module.exports = function (mongoose) {
  const modelName = 'ticket';
  const Types = mongoose.Schema.Types;
  const Schema = new mongoose.Schema({
    performanceTitle: {
      type: Types.String,
      required: true,
    },
    performanceTime: {
      type: Types.Date,
      required: true,
    },
    customerName: {
      type: Types.String,
      required: true,
    },
    ticketPrice: {
      type: Types.Number,
      required: true,
    },
    createdAt: {
      type: Types.Date,
      default: moment().toISOString(),
    },
  });

  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      alias: 'analytics',
      allowList: false,
      allowRead: false,
      allowCreate: false,
      allowUpdate: false,
      allowDelete: false,
      extraEndpoints: [
        // Revenue Analysis
        function (server, model, options, logger) {
          const Log = logger.bind('Revenue Analysis');
          const Boom = require('@hapi/boom');

          const collectionName = model.collectionDisplayName || model.modelName;
          Log.note('Generating Revenue Analysis endpoint for ' + collectionName);

          const handler = async function (request, h) {
            try {
              let data = {};

              if (request?.query?.method === 'aggregation') {
                data = await model.aggregate([
                  { $project: { ticketPrice: 1, createdAt: 1, month: { $month: '$createdAt' } } },
                  { $match: { createdAt: { $gte: request.payload.startDate, $lt: request.payload.endDate } } },
                  { $group: { _id: '$month', summaryProfit: { $sum: '$ticketPrice' } } },
                  {
                    $addFields: {
                      month: {
                        $let: {
                          vars: {
                            monthsInString: monthsArray,
                          },
                          in: {
                            $arrayElemAt: ['$$monthsInString', '$_id'],
                          },
                        },
                      },
                    },
                  },
                  { $unset: ['_id'] },
                ]);
              } else {
                const result = await model
                  .find({ createdAt: { $gte: request.payload.startDate, $lte: request.payload.endDate } })
                  .exec();

                for (const item of result) {
                  if (data[moment(item.createdAt).format('MMMM')]) {
                    data[moment(item.createdAt).format('MMMM')].summaryProfit =
                      data[moment(item.createdAt).format('MMMM')].summaryProfit + item.ticketPrice;
                  } else {
                    data[moment(item.createdAt).format('MMMM')] = {
                      month: moment(item.createdAt).format('MMMM'),
                      summaryProfit: item.ticketPrice,
                    };
                  }
                }
                data = Object.values(data);
              }
              return h.response(data).code(200);
            } catch (err) {
              Log.error(err);
              throw Boom.badImplementation(err);
            }
          };

          server.route({
            method: 'POST',
            path: '/analytics/revenue',
            config: {
              handler: handler,
              auth: null,
              description: 'Get revenue analytics',
              tags: ['api'],
              validate: {
                query: RestHapi.joi.object().required().keys({
                  method: RestHapi.joi.string().optional(),
                }),
                payload: {
                  startDate: RestHapi.joi.date().iso().required().description('The is the filter Start-Date'),
                  endDate: RestHapi.joi
                    .date()
                    .iso()
                    .required()
                    .min(RestHapi.joi.ref('startDate'))
                    .required()
                    .description('The is the filter End-Date'),
                },
              },
              plugins: {
                'hapi-swagger': {
                  responseMessages: [
                    { code: 204, message: 'Success' },
                    { code: 400, message: 'Bad Request' },
                    { code: 404, message: 'Not Found' },
                    { code: 500, message: 'Internal Server Error' },
                  ],
                },
              },
            },
          });
        },
        // Visited Analysis
        function (server, model, options, logger) {
          const Log = logger.bind('Visited Analysis');
          const Boom = require('@hapi/boom');

          const collectionName = model.collectionDisplayName || model.modelName;
          Log.note('Generating Visited Analysis endpoint for ' + collectionName);

          const handler = async function (request, h) {
            try {
              let data = {};

              if (request?.query?.method === 'aggregation') {
                data = await model.aggregate([
                  { $project: { performanceTime: 1, month: { $month: '$performanceTime' } } },
                  { $match: { performanceTime: { $gte: request.payload.startDate, $lt: request.payload.endDate } } },
                  { $group: { _id: '$month', summaryVisits: { $sum: 1 } } },
                  {
                    $addFields: {
                      month: {
                        $let: {
                          vars: {
                            monthsInString: monthsArray,
                          },
                          in: {
                            $arrayElemAt: ['$$monthsInString', '$_id'],
                          },
                        },
                      },
                    },
                  },
                  { $unset: ['_id'] },
                ]);
              } else {
                const result = await model
                  .find({ performanceTime: { $gte: request.payload.startDate, $lte: request.payload.endDate } })
                  .exec();

                for (const item of result) {
                  if (data[moment(item.performanceTime).format('MMMM')]) {
                    data[moment(item.performanceTime).format('MMMM')].summaryVisits =
                      data[moment(item.performanceTime).format('MMMM')].summaryVisits + 1;
                  } else {
                    data[moment(item.performanceTime).format('MMMM')] = {
                      month: moment(item.performanceTime).format('MMMM'),
                      summaryVisits: 1,
                    };
                  }
                }
                data = Object.values(data);
              }
              return h.response(data).code(200);
            } catch (err) {
              Log.error(err);
              throw Boom.badImplementation(err);
            }
          };

          server.route({
            method: 'POST',
            path: '/analytics/visited',
            config: {
              handler: handler,
              auth: null,
              description: 'Get visited analytics',
              tags: ['api'],
              validate: {
                query: RestHapi.joi.object().required().keys({
                  method: RestHapi.joi.string().optional(),
                }),
                payload: {
                  startDate: RestHapi.joi.date().iso().required().description('The is the filter Start-Date'),
                  endDate: RestHapi.joi
                    .date()
                    .iso()
                    .required()
                    .min(RestHapi.joi.ref('startDate'))
                    .required()
                    .description('The is the filter End-Date'),
                },
              },
              plugins: {
                'hapi-swagger': {
                  responseMessages: [
                    { code: 204, message: 'Success' },
                    { code: 400, message: 'Bad Request' },
                    { code: 404, message: 'Not Found' },
                    { code: 500, message: 'Internal Server Error' },
                  ],
                },
              },
            },
          });
        },
      ],
    },
  };

  return Schema;
};
