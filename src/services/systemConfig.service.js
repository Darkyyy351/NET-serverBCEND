const path = require('path');
const { readJsonObject, writeJsonObject } = require('./jsonStore');

const filePath = path.join(__dirname, '../../data/system.json');
const modes = new Set(['normal', 'eco']);
const defaults = { mode: 'normal' };
let cachedConfig = null;

function normalizeMode(mode) {
  // NET briefly used "sleep" for this application-level mode before 0.2.
  return mode === 'sleep' ? 'eco' : mode;
}

function readConfig() {
  if (cachedConfig) {
    return { ...cachedConfig };
  }

  const config = readJsonObject(filePath, defaults);
  const mode = normalizeMode(config.mode);
  cachedConfig = { mode: modes.has(mode) ? mode : defaults.mode };

  return { ...cachedConfig };
}

function getStatus() {
  const { mode } = readConfig();
  const eco = mode === 'eco';

  return {
    mode,
    monitoringIntervalSeconds: eco ? 30 : 1,
    heartbeatPersistenceSeconds: eco ? 60 : 0
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
