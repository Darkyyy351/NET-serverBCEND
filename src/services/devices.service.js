const path = require('path');
const crypto = require('crypto');
const { readJsonArray, writeJsonArray } = require('./jsonStore');
const logs = require('./logs.service');
const systemConfig = require('./systemConfig.service');

const filePath = path.join(__dirname, '../../data/devices.json');
const DEFAULT_OFFLINE_AFTER_SECONDS = 35;
const liveLastSeen = new Map();

function readData() {
  return readJsonArray(filePath);
}

function writeData(data) {
  writeJsonArray(filePath, data);
}

function newId() {
  return crypto.randomUUID();
}

function normalizeDevice(device) {
  return {
    id: device.id,
    name: device.name,
    ip: device.ip || null,
    type: device.type || 'esp',
    status: device.status || 'unknown',
    firmware: device.firmware || null,
    capabilities: Array.isArray(device.capabilities) ? device.capabilities : [],
    lastSeen: device.lastSeen || null,
    createdAt: device.createdAt || new Date().toISOString(),
    updatedAt: device.updatedAt || new Date().toISOString(),
    commands: Array.isArray(device.commands) ? device.commands : []
  };
}

function offlineAfterMs() {
  const configured = Number(process.env.DEVICE_OFFLINE_AFTER_SECONDS);
  const seconds = Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_OFFLINE_AFTER_SECONDS;

  return seconds * 1000;
}

function latestLastSeen(device) {
  const persisted = device.lastSeen ? Date.parse(device.lastSeen) : NaN;
  const live = liveLastSeen.get(device.id);

  if (Number.isFinite(live) && (!Number.isFinite(persisted) || live > persisted)) {
    return new Date(live).toISOString();
  }

  return device.lastSeen || null;
}

function effectiveStatus(device, lastSeen) {
  if (!lastSeen) {
    return device.status === 'online' ? 'unknown' : device.status;
  }

  const lastSeenAt = Date.parse(lastSeen);

  if (!Number.isFinite(lastSeenAt)) {
    return 'unknown';
  }

  if (Date.now() - lastSeenAt > offlineAfterMs()) {
    return 'offline';
  }

  return device.status;
}

function publicDevice(device) {
  const normalized = normalizeDevice(device);
  const pendingCommands = normalized.commands.filter(command => command.status === 'queued').length;
  const lastSeen = latestLastSeen(normalized);

  return {
    id: normalized.id,
    name: normalized.name,
    ip: normalized.ip,
    type: normalized.type,
    status: effectiveStatus(normalized, lastSeen),
    firmware: normalized.firmware,
    capabilities: normalized.capabilities,
    lastSeen,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    pendingCommands
  };
}

function findDevice(devices, id) {
  return devices.find(device => device.id === id);
}

exports.getAll = () => {
  return readData().map(publicDevice);
};

exports.create = ({ name, ip, type, firmware, capabilities }) => {
  const devices = readData();
  const now = new Date().toISOString();

  const newDevice = {
    id: newId(),
    name,
    ip: ip || null,
    type: type || 'esp',
    status: 'unknown',
    firmware: firmware || null,
    capabilities: Array.isArray(capabilities) ? capabilities : [],
    lastSeen: null,
    createdAt: now,
    updatedAt: now,
    commands: []
  };

  devices.push(newDevice);
  writeData(devices);
  logs.append({
    type: 'device',
    message: `Device created: ${newDevice.name}`,
    meta: { deviceId: newDevice.id, ip: newDevice.ip, type: newDevice.type }
  });

  return publicDevice(newDevice);
};

exports.register = ({ id, name, ip, type, firmware, capabilities }) => {
  const devices = readData();
  const now = new Date().toISOString();
  const deviceId = id || newId();
  const existing = findDevice(devices, deviceId);

  if (existing) {
    existing.name = name || existing.name;
    existing.ip = ip || existing.ip || null;
    existing.type = type || existing.type || 'esp';
    existing.firmware = firmware || existing.firmware || null;
    existing.capabilities = Array.isArray(capabilities) ? capabilities : existing.capabilities || [];
    existing.status = 'online';
    existing.lastSeen = now;
    existing.updatedAt = now;
    existing.commands = Array.isArray(existing.commands) ? existing.commands : [];
    liveLastSeen.set(existing.id, Date.parse(now));

    writeData(devices);
    logs.append({
      type: 'device',
      message: `Device registered: ${existing.name}`,
      meta: { deviceId: existing.id, ip: existing.ip, firmware: existing.firmware }
    });
    return publicDevice(existing);
  }

  const device = {
    id: deviceId,
    name: name || `ESP ${deviceId.slice(0, 8)}`,
    ip: ip || null,
    type: type || 'esp',
    status: 'online',
    firmware: firmware || null,
    capabilities: Array.isArray(capabilities) ? capabilities : [],
    lastSeen: now,
    createdAt: now,
    updatedAt: now,
    commands: []
  };

  devices.push(device);
  liveLastSeen.set(device.id, Date.parse(now));
  writeData(devices);
  logs.append({
    type: 'device',
    message: `Device registered: ${device.name}`,
    meta: { deviceId: device.id, ip: device.ip, firmware: device.firmware }
  });

  return publicDevice(device);
};

exports.heartbeat = (id, { status, ip, firmware, capabilities } = {}) => {
  const devices = readData();
  const device = findDevice(devices, id);

  if (!device) {
    return null;
  }

  const nextStatus = status || 'online';
  const nextIp = ip || device.ip || null;
  const nextFirmware = firmware || device.firmware || null;
  const nextCapabilities = Array.isArray(capabilities) ? capabilities : device.capabilities || [];
  const metadataChanged = (
    device.status !== nextStatus ||
    (device.ip || null) !== nextIp ||
    (device.firmware || null) !== nextFirmware ||
    JSON.stringify(device.capabilities || []) !== JSON.stringify(nextCapabilities)
  );
  const mode = systemConfig.getStatus();
  const now = new Date();
  liveLastSeen.set(device.id, now.getTime());
  const lastPersistedAt = device.lastSeen ? Date.parse(device.lastSeen) : 0;
  const persistenceDue = (
    mode.heartbeatPersistenceSeconds === 0 ||
    !Number.isFinite(lastPersistedAt) ||
    now.getTime() - lastPersistedAt >= mode.heartbeatPersistenceSeconds * 1000
  );

  device.status = nextStatus;
  device.ip = nextIp;
  device.firmware = nextFirmware;
  device.capabilities = nextCapabilities;
  device.lastSeen = now.toISOString();
  device.updatedAt = device.lastSeen;

  if (metadataChanged || persistenceDue) {
    writeData(devices);
    logs.append({
      type: 'heartbeat',
      message: `Heartbeat received from ${device.name}`,
      meta: { deviceId: device.id, status: device.status, ip: device.ip }
    });
  }

  return publicDevice(device);
};

exports.remove = (id) => {
  const devices = readData();
  const device = findDevice(devices, id);
  const filtered = devices.filter(d => d.id !== id);

  if (!device) {
    return false;
  }

  writeData(filtered);
  liveLastSeen.delete(id);
  logs.append({
    type: 'device',
    level: 'warn',
    message: `Device removed: ${device.name}`,
    meta: { deviceId: id, deviceName: device.name }
  });
  return true;
};

exports.getCommands = (id) => {
  const device = findDevice(readData(), id);

  if (!device) {
    return null;
  }

  return normalizeDevice(device).commands;
};

exports.queueCommand = (id, { type, payload }) => {
  const devices = readData();
  const device = findDevice(devices, id);

  if (!device) {
    return null;
  }

  const now = new Date().toISOString();
  device.commands = Array.isArray(device.commands) ? device.commands : [];

  const command = {
    id: newId(),
    type,
    payload: payload || {},
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    result: null,
    error: null
  };

  device.commands.push(command);
  device.updatedAt = now;
  writeData(devices);
  logs.append({
    type: 'cmd',
    message: `Command queued: ${type}`,
    meta: { deviceId: id, commandId: command.id, commandType: type }
  });

  return command;
};

exports.claimNextCommand = (id) => {
  const devices = readData();
  const device = findDevice(devices, id);

  if (!device) {
    return null;
  }

  device.commands = Array.isArray(device.commands) ? device.commands : [];

  const command = device.commands.find(item => item.status === 'queued');

  if (!command) {
    return false;
  }

  const now = new Date().toISOString();
  command.status = 'running';
  command.updatedAt = now;
  command.startedAt = now;
  device.updatedAt = now;

  writeData(devices);
  logs.append({
    type: 'cmd',
    message: `Command claimed: ${command.type}`,
    meta: { deviceId: id, commandId: command.id, commandType: command.type }
  });

  return command;
};

exports.ackCommand = (deviceId, commandId, { status, result, error }) => {
  const devices = readData();
  const device = findDevice(devices, deviceId);

  if (!device) {
    return null;
  }

  device.commands = Array.isArray(device.commands) ? device.commands : [];

  const command = device.commands.find(item => item.id === commandId);

  if (!command) {
    return false;
  }

  const now = new Date().toISOString();

  command.status = status === 'failed' ? 'failed' : 'done';
  command.result = result || null;
  command.error = error || null;
  command.updatedAt = now;
  command.finishedAt = now;
  device.updatedAt = now;

  writeData(devices);
  logs.append({
    type: 'cmd',
    level: command.status === 'failed' ? 'error' : 'info',
    message: `Command ${command.status}: ${command.type}`,
    meta: { deviceId, commandId, commandType: command.type }
  });

  return command;
};
