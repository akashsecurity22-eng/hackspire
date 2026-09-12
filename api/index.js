'use strict';
const { handleRequest } = require('../server');

module.exports = async (req, res) => {
  if (req.headers['x-matched-path']) {
    const qIdx = req.url.indexOf('?');
    let qs = '';
    if (qIdx >= 0) {
      const parsed = new URL(req.url, 'http://localhost');
      parsed.searchParams.delete('__url');
      const s = parsed.searchParams.toString();
      if (s) qs = '?' + s;
    }
    req.url = req.headers['x-matched-path'] + qs;
  } else if (req.url.startsWith('/api/index.js')) {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const realPath = parsed.searchParams.get('__url');
      if (realPath) {
        parsed.searchParams.delete('__url');
        const s = parsed.searchParams.toString();
        req.url = realPath + (s ? '?' + s : '');
      } else {
        req.url = '/';
      }
    } catch {
      req.url = '/';
    }
  }
  return handleRequest(req, res);
};
