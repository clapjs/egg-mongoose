'use strict';

const mongoose = require('./lib/mongoose');

class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  async didLoad() {
    if (this.app.config.mongoose.app) mongoose(this.app);
  }

  async willReady() {
    // 请将你的应用项目中 app.beforeStart 中的代码置于此处。
  }
}

module.exports = AppBootHook;
