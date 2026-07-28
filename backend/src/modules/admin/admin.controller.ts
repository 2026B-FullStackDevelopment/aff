// Handles admin HTTP requests and returns admin DTOs.
const adminService = require('./admin.service');
const { toAdminDashboardDto } = require('./admin.dto');
const { ok } = require('../../shared/http/response');

async function getDashboardSummary(req, res, next) {
  try {
    const summary = await adminService.getDashboardSummary();
    return ok(res, toAdminDashboardDto(summary));
  } catch (error) {
    return next(error);
  }
}

module.exports = { getDashboardSummary };
