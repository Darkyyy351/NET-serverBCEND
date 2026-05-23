const fs = require('fs');
const path = require('path');

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJsonArray(filePath) {
  ensureDirectory(filePath);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]\n');
    return [];
  }

  const raw = fs.readFileSync(filePath, 'utf8').trim();

  if (!raw) {
    return [];
  }

  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error(`${path.basename(filePath)} must contain a JSON array`);
  }

  return data;
}

function writeJsonArray(filePath, data) {
  if (!Array.isArray(data)) {
    throw new Error('JSON store only accepts arrays');
  }

  ensureDirectory(filePath);

  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tempPath, filePath);
}

module.exports = {
  readJsonArray,
  writeJsonArray
};
