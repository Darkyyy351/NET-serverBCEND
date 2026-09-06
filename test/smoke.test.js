const assert = require('assert');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');

const dataPath = path.join(__dirname, '../data/devices.json');
const logsPath = path.join(__dirname, '../data/logs.json');
const deploymentPath = path.join(__dirname, '../data/deployment.json');
const systemConfigPath = path.join(__dirname, '../data/system.json');
const hwmonRoot = path.join(__dirname, 'tmp-hwmon');
const fanHwmonPath = path.join(hwmonRoot, 'hwmon3');
const originalData = fs.existsSync(dataPath) ? fs.readFileSync(dataPath, 'utf8') : '[]\n';
const originalLogs = fs.existsSync(logsPath) ? fs.readFileSync(logsPath, 'utf8') : '[]\n';
const originalDeployment = fs.existsSync(deploymentPath) ? fs.readFileSync(deploymentPath, 'utf8') : null;
const originalSystemConfig = fs.existsSync(systemConfigPath) ? fs.readFileSync(systemConfigPath, 'utf8') : null;

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
  process.env.NET_HWMON_ROOT = hwmonRoot;
  fs.mkdirSync(fanHwmonPath, { recursive: true });
  fs.writeFileSync(path.join(fanHwmonPath, 'name'), 'pwmfan\n');
  fs.writeFileSync(path.join(fanHwmonPath, 'pwm1'), '128\n');
  fs.writeFileSync(path.join(fanHwmonPath, 'fan1_input'), '4200\n');
  fs.writeFileSync(path.join(fanHwmonPath, 'pwm1_enable'), '1\n');
  fs.writeFileSync(dataPath, '[]\n');
  fs.writeFileSync(logsPath, '[]\n');
  fs.writeFileSync(systemConfigPath, '{"mode":"normal"}\n');
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
    assert.equal(typeof systemStatusBody.data.host.cpu, 'object');
    assert.ok(systemStatusBody.data.host.cpu.cores === null || systemStatusBody.data.host.cpu.cores > 0);
    assert.ok(systemStatusBody.data.host.memory.total > 0);
    assert.ok(systemStatusBody.data.host.storage.total === null || systemStatusBody.data.host.storage.total > 0);
    assert.equal(systemStatusBody.data.host.fan.available, true);
    assert.equal(systemStatusBody.data.host.fan.driver, 'pwmfan');
    assert.equal(systemStatusBody.data.host.fan.rpm, 4200);
    assert.equal(systemStatusBody.data.host.fan.pwm, 128);
    assert.equal(systemStatusBody.data.host.fan.pwmPercent, 50.2);
    assert.equal(systemStatusBody.data.host.fan.controlMode, 1);
    assert.equal(systemStatusBody.data.operatingMode.mode, 'normal');
    assert.equal(systemStatusBody.data.operatingMode.monitoringIntervalSeconds, 1);

    const fanControlStatus = await request(baseUrl, '/api/v1/system/fan-control');
    assert.equal(fanControlStatus.status, 200);
    const fanControlStatusBody = await fanControlStatus.json();
    assert.equal(fanControlStatusBody.data.available, false);

    const invalidFanTest = await request(baseUrl, '/api/v1/system/fan-control/test', {
      method: 'POST',
      body: JSON.stringify({ state: 5, duration: 60 })
    });
    assert.equal(invalidFanTest.status, 400);

    const invalidMode = await request(baseUrl, '/api/v1/system/mode', {
      method: 'POST',
      body: JSON.stringify({ mode: 'hibernate' })
    });
    assert.equal(invalidMode.status, 400);

    const ecoMode = await request(baseUrl, '/api/v1/system/mode', {
      method: 'POST',
      body: JSON.stringify({ mode: 'eco' })
    });
    assert.equal(ecoMode.status, 200);
    const ecoModeBody = await ecoMode.json();
    assert.equal(ecoModeBody.data.operatingMode.mode, 'eco');
    assert.equal(ecoModeBody.data.operatingMode.monitoringIntervalSeconds, 30);

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
    assert.equal((await register.json()).data.admission, 'pending');
    assert.equal((await (await request(baseUrl, '/api/v1/devices')).json()).data.length, 0);
    assert.equal((await request(baseUrl, '/api/v1/devices/esp-test-01/commands/next')).status, 403);
    const duplicate = await request(baseUrl, '/api/v1/devices/register', { method: 'POST', body: JSON.stringify({ id: 'esp-test-01', admission: 'approved' }) });
    assert.equal((await duplicate.json()).data.admission, 'pending');
    assert.equal((await (await request(baseUrl, '/api/v1/devices/requests')).json()).data.length, 1);
    assert.equal((await request(baseUrl, '/api/v1/devices/esp-test-01/admission', { method: 'POST', body: JSON.stringify({ decision: 'approved' }) })).status, 200);

    await request(baseUrl, '/api/v1/devices/register', { method: 'POST', body: JSON.stringify({ id: 'esp-rejected' }) });
    await request(baseUrl, '/api/v1/devices/esp-rejected/admission', { method: 'POST', body: JSON.stringify({ decision: 'rejected' }) });
    const rejected = await request(baseUrl, '/api/v1/devices/register', { method: 'POST', body: JSON.stringify({ id: 'esp-rejected' }) });
    assert.equal((await rejected.json()).data.admission, 'rejected');
    assert.equal((await request(baseUrl, '/api/v1/devices/esp-rejected/heartbeat', { method: 'POST', body: '{}' })).status, 403);
    assert.equal((await request(baseUrl, '/api/v1/devices/esp-rejected/commands', { method: 'POST', body: JSON.stringify({ type: 'identify' }) })).status, 403);
    assert.equal(JSON.parse(fs.readFileSync(dataPath, 'utf8')).find(d => d.id === 'esp-rejected').admission, 'rejected');

    process.env.DEVICE_OFFLINE_AFTER_SECONDS = '0.01';
    await new Promise(resolve => setTimeout(resolve, 20));
    const staleDevices = await request(baseUrl, '/api/v1/devices');
    const staleDevicesBody = await staleDevices.json();
    assert.equal(staleDevicesBody.data[0].status, 'offline');
    process.env.DEVICE_OFFLINE_AFTER_SECONDS = '35';

    const persistedAfterRegister = JSON.parse(fs.readFileSync(dataPath, 'utf8'))[0].lastSeen;
    await new Promise(resolve => setTimeout(resolve, 10));

    const heartbeat = await request(baseUrl, '/api/v1/devices/esp-test-01/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ status: 'online' })
    });
    assert.equal(heartbeat.status, 200);
    const heartbeatBody = await heartbeat.json();
    const persistedAfterEcoHeartbeat = JSON.parse(fs.readFileSync(dataPath, 'utf8'))[0].lastSeen;
    assert.equal(persistedAfterEcoHeartbeat, persistedAfterRegister);
    assert.notEqual(heartbeatBody.data.lastSeen, persistedAfterRegister);

    const devicesAfterEcoHeartbeat = await request(baseUrl, '/api/v1/devices');
    const devicesAfterEcoHeartbeatBody = await devicesAfterEcoHeartbeat.json();
    assert.equal(devicesAfterEcoHeartbeatBody.data[0].status, 'online');
    assert.equal(devicesAfterEcoHeartbeatBody.data[0].lastSeen, heartbeatBody.data.lastSeen);

    const normalMode = await request(baseUrl, '/api/v1/system/mode', {
      method: 'POST',
      body: JSON.stringify({ mode: 'normal' })
    });
    assert.equal(normalMode.status, 200);

    const queued = await request(baseUrl, '/api/v1/devices/esp-test-01/commands', {
      method: 'POST',
      body: JSON.stringify({ type: 'identify', payload: { times: 2 } })
    });
    assert.equal(queued.status, 201);

    const next = await request(baseUrl, '/api/v1/devices/esp-test-01/commands/next');
    assert.equal(next.status, 200);
    const nextBody = await next.json();
    assert.equal(nextBody.data.type, 'identify');

    const ack = await request(baseUrl, `/api/v1/devices/esp-test-01/commands/${nextBody.data.id}/ack`, {
      method: 'POST',
      body: JSON.stringify({ status: 'done', result: { ok: true } })
    });
    assert.equal(ack.status, 200);
    const unsupported = await request(baseUrl, '/api/v1/devices/esp-test-01/verify', { method: 'POST', body: '{}' });
    assert.equal((await unsupported.json()).data.status, 'unsupported');
    await request(baseUrl, '/api/v1/devices/esp-test-01/heartbeat', { method: 'POST', body: JSON.stringify({ capabilities: ['probe'] }) });
    const probe = (await (await request(baseUrl, '/api/v1/devices/esp-test-01/verify', { method: 'POST', body: '{}' })).json()).data;
    const repeated = (await (await request(baseUrl, '/api/v1/devices/esp-test-01/verify', { method: 'POST', body: '{}' })).json()).data;
    assert.equal(repeated.id, probe.id);
    const claimed = (await (await request(baseUrl, '/api/v1/devices/esp-test-01/commands/next')).json()).data;
    assert.equal(claimed.id, probe.id);
    await request(baseUrl, `/api/v1/devices/esp-test-01/commands/${probe.id}/ack`, { method: 'POST', body: JSON.stringify({ status: 'done' }) });
    assert.equal((await (await request(baseUrl, `/api/v1/devices/esp-test-01/verify/${probe.id}`)).json()).data.status, 'confirmed');
    const expired = (await (await request(baseUrl, '/api/v1/devices/esp-test-01/verify', { method: 'POST', body: '{}' })).json()).data;
    const stored = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    stored.find(d => d.id === 'esp-test-01').commands.find(c => c.id === expired.id).expiresAt = new Date(0).toISOString();
    fs.writeFileSync(dataPath, JSON.stringify(stored));
    assert.equal((await (await request(baseUrl, `/api/v1/devices/esp-test-01/verify/${expired.id}`)).json()).data.status, 'no-response');
    assert.equal((await (await request(baseUrl, '/api/v1/devices/esp-test-01/commands/next')).json()).data, null);
    assert.equal((await request(baseUrl, `/api/v1/devices/esp-test-01/commands/${expired.id}/ack`, { method: 'POST', body: JSON.stringify({ status: 'done' }) })).status, 404);

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
    fs.rmSync(hwmonRoot, { recursive: true, force: true });
    fs.writeFileSync(dataPath, originalData);
    fs.writeFileSync(logsPath, originalLogs);
    if (originalDeployment === null) {
      fs.rmSync(deploymentPath, { force: true });
    } else {
      fs.writeFileSync(deploymentPath, originalDeployment);
    }
    if (originalSystemConfig === null) {
      fs.rmSync(systemConfigPath, { force: true });
    } else {
      fs.writeFileSync(systemConfigPath, originalSystemConfig);
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
