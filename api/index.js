let app;

try {
  app = require('../server/server');
} catch (error) {
  console.error('Failed to load BSMS server:', error);

  module.exports = (_req, res) => {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Failed to load BSMS server',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }));
  };
  return;
}

module.exports = app;
