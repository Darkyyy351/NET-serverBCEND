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
    runtime: getRuntimeStatus(),
    services: getServices()
  };
};
