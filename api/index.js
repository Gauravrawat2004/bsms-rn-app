module.exports = async function handler(req, res) {
  try {
    const app = require('../server/server');
    return app(req, res);
  } catch (error) {
    console.error('Failed to load or run BSMS server:', error);

    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Failed to load or run BSMS server',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }));
  }
};
