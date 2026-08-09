// Exposes safe admin operations for other modules if cross-module admin functions are ever needed.
import * as adminService from './admin.service.js';

const adminInterface = {
  getDashboardSummary: adminService.getDashboardSummary,
};

export { adminInterface };
