// Handles admin HTTP requests and returns admin DTOs.
import * as adminService from './admin.service.js';
import { toAdminDashboardDto } from './admin.dto.js';
import { ok } from '../../shared/http/response.js';

async function getDashboardSummary(req, res, next) {
  try {
    const summary = await adminService.getDashboardSummary();
    return ok(res, toAdminDashboardDto(summary));
  } catch (error) {
    return next(error);
  }
}

export { getDashboardSummary };
