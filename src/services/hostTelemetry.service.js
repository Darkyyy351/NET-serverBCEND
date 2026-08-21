const fs = require('fs');
const os = require('os');
const path = require('path');

const dataPath = path.join(__dirname, '../../data');
let previousCpuSample = readCpuSample();

function round(value, precision = 1) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch {
    return null;
  }
}

function readCpuSample() {
  try {
    const cpus = os.cpus();
    const sample = cpus.reduce((totals, cpu) => {
      const values = Object.values(cpu.times);

      totals.idle += cpu.times.idle;
      totals.total += values.reduce((sum, value) => sum + value, 0);
      return totals;
    }, { idle: 0, total: 0 });

    return {
      ...sample,
      cores: cpus.length
    };
  } catch {
    return null;
  }
}

function getCpuTelemetry() {
  const current = readCpuSample();

  if (!current) {
    return { usagePercent: null, cores: null };
  }

  const previous = previousCpuSample;
  previousCpuSample = current;

  if (!previous) {
    return { usagePercent: null, cores: current.cores };
  }

  const totalDelta = current.total - previous.total;
  const idleDelta = current.idle - previous.idle;
  const usagePercent = totalDelta > 0
    ? ((totalDelta - idleDelta) / totalDelta) * 100
    : null;

  return {
    usagePercent: round(usagePercent),
    cores: current.cores
  };
}

function parseMemInfo(raw) {
  if (!raw) {
    return null;
  }

  const values = {};

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_()]+):\s+(\d+)\s+kB$/);

    if (match) {
      values[match[1]] = Number(match[2]) * 1024;
    }
  }

  const total = values.MemTotal;
  const available = values.MemAvailable;

  if (!Number.isFinite(total) || !Number.isFinite(available) || total <= 0) {
    return null;
  }

  const used = Math.max(total - available, 0);

  return {
    total,
    used,
    available,
    usagePercent: round((used / total) * 100)
  };
}

function getMemoryTelemetry() {
  const procRoot = process.env.NET_PROC_ROOT || '/proc';
  const fromProc = parseMemInfo(safeRead(path.join(procRoot, 'meminfo')));

  if (fromProc) {
    return fromProc;
  }

  const total = os.totalmem();
  const available = os.freemem();
  const used = Math.max(total - available, 0);

  return {
    total,
    used,
    available,
    usagePercent: total > 0 ? round((used / total) * 100) : null
  };
}

function getHostUptime() {
  const procRoot = process.env.NET_PROC_ROOT || '/proc';
  const raw = safeRead(path.join(procRoot, 'uptime'));
  const value = raw ? Number(raw.split(/\s+/)[0]) : os.uptime();

  return Number.isFinite(value) ? value : null;
}

function getTemperature() {
  const thermalRoot = process.env.NET_THERMAL_ROOT || '/sys/class/thermal';

  try {
    const zones = fs.readdirSync(thermalRoot)
      .filter((entry) => entry.startsWith('thermal_zone'))
      .map((entry) => {
        const zonePath = path.join(thermalRoot, entry);
        return {
          type: safeRead(path.join(zonePath, 'type')) || '',
          raw: Number(safeRead(path.join(zonePath, 'temp')))
        };
      })
      .filter((zone) => Number.isFinite(zone.raw));

    const preferred = zones.find((zone) => /cpu|soc|package/i.test(zone.type)) || zones[0];

    if (!preferred) {
      return null;
    }

    const celsius = preferred.raw > 200 ? preferred.raw / 1000 : preferred.raw;
    return round(celsius);
  } catch {
    return null;
  }
}

function getStorageTelemetry() {
  try {
    const stats = fs.statfsSync(dataPath);
    const total = stats.blocks * stats.bsize;
    const available = stats.bavail * stats.bsize;
    const used = Math.max(total - available, 0);

    return {
      total,
      used,
      available,
      usagePercent: total > 0 ? round((used / total) * 100) : null
    };
  } catch {
    return {
      total: null,
      used: null,
      available: null,
      usagePercent: null
    };
  }
}

exports.getHostTelemetry = () => ({
  uptime: getHostUptime(),
  cpu: getCpuTelemetry(),
  memory: getMemoryTelemetry(),
  temperatureC: getTemperature(),
  storage: getStorageTelemetry()
});

