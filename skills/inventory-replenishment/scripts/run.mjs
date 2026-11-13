import { createHelper } from './runtime.mjs';

export const run = createHelper(import.meta.url, 'inventory-replenishment', input => {
  const protectionDays = input.leadDays + input.reviewDays;
  const inventoryPosition = input.usableOnHand + input.confirmedOnOrder - input.backorders;
  const safetyStock = input.zScore * input.dailyStdDev * Math.sqrt(protectionDays);
  const orderUpTo = input.demandPerDay * protectionDays + safetyStock;
  const unconstrainedOrder = Math.max(0, orderUpTo - inventoryPosition);
  const minimumPackOrder = Math.ceil(input.minOrder / input.packSize) * input.packSize;
  const desired = unconstrainedOrder > 0 ? Math.max(minimumPackOrder, Math.ceil(unconstrainedOrder / input.packSize) * input.packSize) : 0;
  const capacity = Math.floor(input.maxOrder / input.packSize) * input.packSize;
  const constraints = [];
  let orderQuantity = desired;
  if (desired > capacity) {
    constraints.push('max_order_limits_target'); orderQuantity = capacity;
    if (orderQuantity < minimumPackOrder) { orderQuantity = 0; constraints.push('minimum_order_infeasible'); }
  }
  const unmetQuantity = Math.max(0, unconstrainedOrder - orderQuantity);
  return { status: unmetQuantity > 0 || constraints.length ? 'needs_review' : 'completed', result: {
    sku: input.sku, unit: input.unit, protectionDays, inventoryPosition, safetyStock, orderUpTo,
    unconstrainedOrder, orderQuantity, unmetQuantity, constraints,
    serviceClaim: 'conditional_cycle_service_approximation_not_fill_rate'
  } };
});
