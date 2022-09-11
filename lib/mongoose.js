'use strict';

const assert = require('assert');
const path = require('path');

module.exports = app => {
  app.Mongoose = require('mongoose');
  app.addSingleton('mongoose', createOneClient);
};

function filterURLPassword(input) {
  const index = input.indexOf('@');
  if (index === -1) return input;
  const startIndex = input.lastIndexOf(':', index);
  return input.substring(0, startIndex + 1) + '******' + input.substring(index);
}

async function createOneClient(config, app) {
  config = Object.assign({}, { singleton: 'model', framework: false }, config);
  if (app[config.singleton]) {
    throw new Error(`[egg-mongoose] app[${config.singleton}] is already defined`);
  }
  const { url, options, plugins } = config;
  const filteredURL = filterURLPassword(url);
  assert(url, '[egg-mongoose] url is required on config');
  if (!options.hasOwnProperty('useNewUrlParser')) {
    options.useNewUrlParser = true;
  }
  app.coreLogger.info('[egg-mongoose] connecting %s', filteredURL);
  // remove all plugins
  const length = Array.isArray(app.Mongoose.plugins) ? app.Mongoose.plugins.length : 0;
  for (let index = length; index > 0; index--) {
    app.Mongoose.plugins.pop();
  }
  // combine clients plugins and public plugins
  [].concat(plugins || [], []).forEach(plugin => {
    app.Mongoose.plugin.apply(app.Mongoose, Array.isArray(plugin) ? plugin : [ plugin ]);
  });

  const connection = await app.Mongoose.createConnection(url, options);

  /* istanbul ignore next */
  connection.on('error', err => {
    err.message = `[egg-mongoose]${err.message}`;
    app.coreLogger.error(err);
  });

  /* istanbul ignore next */
  connection.on('disconnected', () => {
    app.coreLogger.error(`[egg-mongoose] ${filteredURL} disconnected`);
  });

  connection.on('connected', () => {
    app.coreLogger.info(`[egg-mongoose] ${filteredURL} connected successfully`);
  });
  /* istanbul ignore next */
  connection.on('reconnected', () => {
    app.coreLogger.info(`[egg-mongoose] ${filteredURL} reconnected successfully`);
  });
  const application = app;
  const context = app.context;
  Object.defineProperty(application, config.singleton, {
    value: connection,
    writable: false,
    configurable: true,
  });
  Object.defineProperty(context, config.singleton, {
    get() {
      return application[config.singleton];
    },
    configurable: true,
  });
  const target = Symbol(`app#mongoose_${config.singleton}`);
  const dirs =[path.join(app.baseDir, 'app/model')];
  if (config.framework) {
    dirs.unshift(path.join(app.baseDir, `node_modules/@clapjs/${config.framework}/app/model`));
  }
  app.loader.loadToApp(dirs, target, {
    caseStyle: 'upper',
    call: false,
    initializer(factory, options) {
      if (typeof factory === 'function') {
        const collection = path.basename(options.path, '.js');
        return application[config.singleton].model(collection, factory(app), collection);
      }
    },
  });

  Object.assign(application[config.singleton], app[target]);

  return application[config.singleton];
}
