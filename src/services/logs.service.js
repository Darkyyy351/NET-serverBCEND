const path = require('path');
const crypto = require('crypto');
const { readJsonArray, writeJsonArray } = require('./jsonStore');

const filePath = path.join(__dirname, '../../data/logs.json');
const maxLogs = Number(process.env.LOG_RETENTION_LIMIT || 500);

function readData() {
  return readJsonArray(filePath);
}

function writeData(logs) {
  writeJsonArray(filePath, logs.slice(-maxLogs));
}

function normalizeLog(log) {
  return {
    id: log.id,
    time: log.time,
    type: log.type || 'sys',
    level: log.level || 'info',
    message: log.message,
    meta: log.meta || null
  };
}

function append({ type = 'sys', level = 'info', message, meta = null }) {
  if (!message || typeof message !== 'string') {
    return null;
  }

  const logs = readData();
  const log = {
    id: crypto.randomUUID(),
    time: new Date().toISOString(),
    type,
    level,
    message,
    meta
  };

  logs.push(log);
  writeData(logs);

  return normalizeLog(log);
}

function getRecent(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);

  return readData()
    .slice(-safeLimit)
    .reverse()
    .map(normalizeLog);
}

module.exports = {
  append,
  getRecent
};
