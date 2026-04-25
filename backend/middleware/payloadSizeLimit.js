function payloadSizeLimitMiddleware(req, res, next) {
  const maxPayloadSize = 10 * 1024 * 1024; // 10 MB
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > maxPayloadSize) {
    return res.status(400).send('Payload too large. Maximum payload size is 10 MB.');
  }
  next();
}

module.exports = { payloadSizeLimitMiddleware };
