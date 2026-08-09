// Keeps common success response shapes consistent across controllers.
function ok(res, data, statusCode = 200) {
  return res.status(statusCode).json({ data });
}

function created(res, data) {
  return ok(res, data, 201);
}

export { ok, created };
