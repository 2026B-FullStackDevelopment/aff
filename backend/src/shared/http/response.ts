// Keeps common success response shapes consistent across controllers.
function ok(res, data, statusCode = 200) {
  return res.status(statusCode).json({ data });
}

function created(res, data) {
  return ok(res, data, 201);
}

// Marks routes that exist per docs/api_design.md but have no business logic behind them yet.
function notImplemented(res) {
  return res.status(501).json({ message: 'Not implemented yet.' });
}

export { ok, created, notImplemented };
