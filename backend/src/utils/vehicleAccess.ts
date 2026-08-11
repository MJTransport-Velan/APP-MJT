import { AppError } from '../middlewares/error.middleware';
import { UNRESTRICTED_MANAGER_ROLES } from './groupAccess';

export type VehicleOwnershipFilter = 'OWN' | 'MARKET';

// OWN_FLEET_OPERATOR and MARKET_FLEET_OPERATOR are scoped to their own fleet;
// everyone else (managers/admins) sees both.
export function forcedVehicleOwnership(roles: string[] = []): VehicleOwnershipFilter | undefined {
  if (roles.some((r) => UNRESTRICTED_MANAGER_ROLES.includes(r))) return undefined;
  if (roles.includes('OWN_FLEET_OPERATOR')) return 'OWN';
  if (roles.includes('MARKET_FLEET_OPERATOR')) return 'MARKET';
  return undefined;
}

export function assertVehicleAccess(vehicleOwnership: string, roles: string[] = []) {
  const forced = forcedVehicleOwnership(roles);
  if (forced && vehicleOwnership !== forced) {
    throw new AppError('You do not have access to this vehicle', 403);
  }
}
