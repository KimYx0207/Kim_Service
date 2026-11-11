// Equal-interval, end-of-period FCFF model. Inputs are assumptions, not prices.
export function valueFcff({ cashFlows, discountRate, terminalGrowth, debt, cash }) {
  if (!Array.isArray(cashFlows) || cashFlows.length === 0 || !cashFlows.every(Number.isFinite)) throw new TypeError('cashFlows must be nonempty finite period cash flows');
  if (![discountRate, terminalGrowth, debt, cash].every(Number.isFinite) || discountRate <= -1 || terminalGrowth <= -1 || discountRate <= terminalGrowth || debt < 0 || cash < 0) throw new RangeError('require finite values, discountRate > terminalGrowth > -1 and nonnegative debt/cash');
  const terminalValue = cashFlows.at(-1) * (1 + terminalGrowth) / (discountRate - terminalGrowth);
  const explicitValue = cashFlows.reduce((sum, flow, index) => sum + flow / (1 + discountRate) ** (index + 1), 0);
  const terminalPresentValue = terminalValue / (1 + discountRate) ** cashFlows.length;
  const enterpriseValue = explicitValue + terminalPresentValue;
  const equityValue = enterpriseValue - debt + cash;
  if (![terminalValue, explicitValue, enterpriseValue, equityValue].every(Number.isFinite)) throw new RangeError('model overflow');
  return { explicitValue, terminalValue, terminalPresentValue, enterpriseValue, equityValue };
}
