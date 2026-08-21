const fs = require('fs');
const path = require('path');
const packageInfo = require('../../package.json');
const hostTelemetry = require('./hostTelemetry.service');

const deploymentPath = path.join(__dirname, '../../data/deployment.json');

function stringOrNull(value) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function getBuildStatus() {
  return {
    version: process.env.NET_VERSION || packageInfo.version,
    commit: process.env.NET_COMMIT_SHA || 'development',
    builtAt: stringOrNull(process.env.NET_BUILD_TIME),
    image: stringOrNull(process.env.NET_IMAGE_REF)
  };
}

function normalizeDeploymentComponent(component) {
  if (!component || typeof component !== 'object') {
    return null;
  }

  return {
    commit: stringOrNull(component.commit),
    image: stringOrNull(component.image)
  };
}

function getDeploymentStatus() {
  const fallback = {
    status: 'untracked',
    deployedAt: null,
    backend: null,
    frontend: null
  };

  try {
    if (!fs.existsSync(deploymentPath)) {
      return fallback;
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

    if (!deployment || typeof deployment !== 'object') {
      return fallback;
    }

    return {
      status: stringOrNull(deployment.status) || 'unknown',
      deployedAt: stringOrNull(deployment.deployedAt),
      backend: normalizeDeploymentComponent(deployment.backend),
      frontend: normalizeDeploymentComponent(deployment.frontend)
    };
  } catch (error) {
    return {
      ...fallback,
      status: 'unavailable'
    };
  }
}

function getRuntimeStatus() {
  return {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: process.memoryUsage()
  };
}

function getServices() {
  return [
    {
      id: 'backend-api',
      name: 'NET Backend API',
      status: 'live',
      detail: 'Express API is responding and ready for dashboard and ESP clients.'
    },
    {
      id: 'docker-compose',
      name: 'Docker Compose Runtime',
      status: process.env.NET_RUNTIME === 'docker' ? 'live' : 'prepared',
      detail: process.env.NET_RUNTIME === 'docker'
        ? 'Backend reports Docker runtime mode from environment.'
        : 'Compose files are prepared; runtime mode is not marked as docker.'
    },
    {
      id: 'mqtt',
      name: 'Future MQTT Broker',
      status: 'planned',
      detail: 'Reserved for NET 1.0 messaging, automations and low-latency node events.'
    }
  ];
}

exports.getStatus = () => {
  return {
    build: getBuildStatus(),
    deployment: getDeploymentStatus(),
    host: hostTelemetry.getHostTelemetry(),
    runtime: getRuntimeStatus(),
    services: getServices()
  };
};
