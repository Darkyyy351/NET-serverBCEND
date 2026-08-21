const assert = require('assert');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');

const dataPath = path.join(__dirname, '../data/devices.json');
const logsPath = path.join(__dirname, '../data/logs.json');
const deploymentPath = path.join(__dirname, '../data/deployment.json');
const originalData = fs.existsSync(dataPath) ? fs.readFileSync(dataPath, 'utf8') : '[]\n';
const originalLogs = fs.existsSync(logsPath) ? fs.readFileSync(logsPath, 'utf8') : '[]\n';
const originalDeployment = fs.existsSync(deploymentPath) ? fs.readFileSync(deploymentPath, 'utf8') : null;

function request(baseUrl, route, options = {}) {
  return fetch(`${baseUrl}${route}`, {
    ...options,
    headers: {
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

async function main() {
  process.env.API_TOKEN = 'test-token';
  process.env.NET_VERSION = '0.2.0-test';
  process.env.NET_COMMIT_SHA = 'backend-test';
  process.env.NET_BUILD_TIME = '2026-08-21T19:00:00Z';
  process.env.NET_IMAGE_REF = 'net-backend:backend-test';
  fs.writeFileSync(dataPath, '[]\n');
  fs.writeFileSync(logsPath, '[]\n');
  fs.writeFileSync(deploymentPath, `${JSON.stringify({
    status: 'healthy',
    deployedAt: '2026-08-21T19:10:22Z',
    backend: { commit: 'backend-test', image: 'net-backend:backend-test' },
    frontend: { commit: 'frontend-test', image: 'net-frontend:frontend-test' }
  }, null, 2)}\n`);

  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const health = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(health.status, 200);

    const systemStatus = await request(baseUrl, '/api/v1/system/status');
    assert.equal(systemStatus.status, 200);
    const systemStatusBody = await systemStatus.json();
    assert.equal(systemStatusBody.data.build.version, '0.2.0-test');
    assert.equal(systemStatusBody.data.build.commit, 'backend-test');
    assert.equal(systemStatusBody.data.deployment.status, 'healthy');
    assert.equal(systemStatusBody.data.deployment.frontend.commit, 'frontend-test');

    const invalidDevice = await request(baseUrl, '/api/v1/devices', {
      method: 'POST',
      body: JSON.stringify({ name: '', ip: '999.168.1.50', type: 'esp' })
    });
    assert.equal(invalidDevice.status, 400);

    const register = await request(baseUrl, '/api/v1/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        id: 'esp-test-01',
        name: 'ESP Test',
        ip: '192.168.1.50',
        firmware: '0.1.0'
      })
    });
    assert.equal(register.status, 201);

    const heartbeat = await request(baseUrl, '/api/v1/devices/esp-test-01/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ status: 'online' })
    });
    assert.equal(heartbeat.status, 200);

    const queued = await request(baseUrl, '/api/v1/devices/esp-test-01/commands', {
      method: 'POST',
      body: JSON.stringify({ type: 'blink', payload: { times: 2 } })
    });
    assert.equal(queued.status, 201);

    const next = await request(baseUrl, '/api/v1/devices/esp-test-01/commands/next');
    assert.equal(next.status, 200);
    const nextBody = await next.json();
    assert.equal(nextBody.data.type, 'blink');

    const ack = await request(baseUrl, `/api/v1/devices/esp-test-01/commands/${nextBody.data.id}/ack`, {
      method: 'POST',
      body: JSON.stringify({ status: 'done', result: { ok: true } })
    });
    assert.equal(ack.status, 200);

    const missingDelete = await request(baseUrl, '/api/v1/devices/missing-device', {
      method: 'DELETE'
    });
    assert.equal(missingDelete.status, 404);

    const removed = await request(baseUrl, '/api/v1/devices/esp-test-01', {
      method: 'DELETE'
    });
    assert.equal(removed.status, 200);

    const logs = await request(baseUrl, '/api/v1/logs');
    assert.equal(logs.status, 200);
    const logsBody = await logs.json();
    assert.equal(logsBody.success, true);
    assert.ok(logsBody.data.length >= 5);
    assert.ok(logsBody.data.some(log => (
      log.type === 'device' &&
      log.message === 'Device removed: ESP Test' &&
      log.meta?.deviceId === 'esp-test-01'
    )));
  } finally {
    server.close();
    fs.writeFileSync(dataPath, originalData);
    fs.writeFileSync(logsPath, originalLogs);
    if (originalDeployment === null) {
      fs.rmSync(deploymentPath, { force: true });
    } else {
      fs.writeFileSync(deploymentPath, originalDeployment);
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
