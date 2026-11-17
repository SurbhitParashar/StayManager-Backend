const permissions = Object.freeze({
  admin: ['data.read', 'data.write', 'data.delete', 'reports.read', 'users.manage'],
  manager: ['data.read', 'data.write', 'reports.read'],
  viewer: ['data.read', 'reports.read'],
});
function permissionsFor(role) {
  return Object.hasOwn(permissions, role) ? [...permissions[role]] : [];
}
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!permissionsFor(req.user.role).includes(permission)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
}
module.exports = { permissionsFor, requirePermission };
