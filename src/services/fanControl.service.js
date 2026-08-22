const net = require('net');

const socketPath = process.env.NET_FAN_CONTROL_SOCKET || '/run/net-fan-control/control.sock';
const requestTimeoutMs = 1500;

class FanControlError extends Error {
  constructor(message, statusCode = 503) {
    super(message);
    this.name = 'FanControlError';
    this.statusCode = statusCode;
  }
}

function request(payload) {
  return new Promise((resolve, reject) => {
    let response = '';
    let settled = false;
    const socket = net.createConnection(socketPath);

    const finish = (callback, value) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      callback(value);
    };

    const timeout = setTimeout(() => {
      finish(reject, new FanControlError('Fan control helper timed out'));
    }, requestTimeoutMs);

    socket.setEncoding('utf8');
    socket.on('connect', () => socket.end(`${JSON.stringify(payload)}\n`));
    socket.on('data', chunk => {
      response += chunk;

      if (response.length > 16384) {
        finish(reject, new FanControlError('Fan control helper returned too much data'));
      }
    });
    socket.on('end', () => {
      try {
        const result = JSON.parse(response.trim());

        if (!result.ok) {
          finish(reject, new FanControlError(result.error || 'Fan control command was rejected', 409));
          return;
        }

        finish(resolve, result.data);
      } catch {
        finish(reject, new FanControlError('Fan control helper returned invalid data'));
      }
    });
    socket.on('error', () => {
      finish(reject, new FanControlError('Fan control helper is unavailable'));
    });
  });
}

exports.getStatus = async () => {
  try {
    return await request({ action: 'status' });
  } catch (error) {
    return {
      available: false,
      mode: 'unavailable',
      error: error.message,
      maxTestSeconds: 60
    };
  }
};

exports.startTest = (state, duration = 60) => request({ action: 'start', state, duration });
exports.stopTest = () => request({ action: 'stop' });
exports.FanControlError = FanControlError;
