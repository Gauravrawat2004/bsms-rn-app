module.exports = function health(_req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    status: 'ok',
    source: 'vercel-health-function',
    time: new Date().toISOString(),
  }));
};
