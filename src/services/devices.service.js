const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const filePath = path.join(__dirname, '../../data/devices.json');

function readData() {
  return JSON.parse(fs.readFileSync(filePath));
}

function writeData(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

exports.getAll = () => {
  return readData();
};

exports.create = ({ name, ip }) => {
  const devices = readData();

  const newDevice = {
    id: uuidv4(),
    name,
    ip,
    status: 'unknown',
    lastSeen: null
  };

  devices.push(newDevice);
  writeData(devices);

  return newDevice;
};

exports.remove = (id) => {
  const devices = readData();
  const filtered = devices.filter(d => d.id !== id);

  writeData(filtered);
};
