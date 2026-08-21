const path = require('path');
const { readJsonObject, writeJsonObject } = require('./jsonStore');

const filePath = path.join(__dirname, '../../data/system.json');
const modes = new Set(['normal', 'sleep']);
const defaults = { mode: 'normal' };
let cachedConfig = null;

function readConfig() {
  if (cachedConfig) {
    return { ...cachedConfig };
  }

  const config = readJsonObject(filePath, defaults);
  cachedConfig = {
    mode: modes.has(config.mode) ? config.mode : defaults.mode
  };

  return { ...cachedConfig };
}

function getStatus() {
  const { mode } = readConfig();
  const sleeping = mode === 'sleep';

  return {
    mode,
    monitoringIntervalSeconds: sleeping ? 30 : 1,
    heartbeatPersistenceSeconds: sleeping ? 60 : 0
  };
}

function setMode(mode) {
  if (!modes.has(mode)) {
    return null;
  }

  const current = readConfig();

  if (current.mode === mode) {
    return { changed: false, ...getStatus() };
  }

  writeJsonObject(filePath, { mode });
  cachedConfig = { mode };
  return { changed: true, ...getStatus() };
}

module.exports = {
  getStatus,
  setMode
};
