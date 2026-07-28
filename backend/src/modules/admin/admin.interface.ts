// Exposes safe admin operations for other modules if cross-module admin functions are ever needed.
const adminService = require('./admin.service');

const adminInterface = {
  getDashboardSummary: adminService.getDashboardSummary,
};

module.exports = { adminInterface };
