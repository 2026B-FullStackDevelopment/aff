// Checks whether a request is authenticated before it reaches protected controllers.
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Authentication is required.' });
  }

  // Replace this demo user with real token/session verification in the auth module.
  req.user = { id: '000000000000000000000000', role: 'RECIPIENT' };
  return next();
}

module.exports = { requireAuth };
