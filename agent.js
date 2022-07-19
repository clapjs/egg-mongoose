'use strict';

const mongoose = require('./lib/mongoose');

class AppBootHook {
  constructor(agent) {
    this.agent = agent;
  }

  async didLoad() {
    if (this.agent.config.mongoose.agent) mongoose(this.agent);
  }

  async willReady() {
    // 请将你的应用项目中 app.beforeStart 中的代码置于此处。
  }
}

module.exports = AppBootHook;
