const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const abuseLogPath = path.join(logsDir, 'abuse.log');

function logAbuseEvent(message) {
  const timestamp = new Date().toISOString();
  try {
    fs.appendFileSync(abuseLogPath, `[${timestamp}] ${message}\n`, 'utf-8');
  } catch (error) {
    console.error('Failed to write to abuse log:', error);
  }
}

function abuseLoggingMiddleware(req, res, next) {
  const originalSend = res.send.bind(res);
  res.send = function (data) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (res.statusCode === 429) {
      logAbuseEvent(`Rate limit violation - IP: ${ip}, Endpoint: ${req.path}`);
    } else if (res.statusCode === 413) {
      logAbuseEvent(`Request size violation - IP: ${ip}, Endpoint: ${req.path}`);
    } else if (res.statusCode === 400 && typeof data === 'string') {
      if (data.includes('Invalid file type') || data.includes('Only JPEG')) {
        logAbuseEvent(`Invalid file type - IP: ${ip}, Endpoint: ${req.path}`);
      } else if (data.includes('Payload too large')) {
        logAbuseEvent(`Payload size violation - IP: ${ip}, Endpoint: ${req.path}`);
      }
    }
    return originalSend(data);
  };
  next();
}

module.exports = { abuseLoggingMiddleware };
