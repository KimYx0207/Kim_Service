// Annual screening estimate; no weather, hourly dispatch, tax or tariff inference.
export function annualEnergyEconomics({generationKwh,selfConsumedKwh,exportedKwh,buyRate,exportRate,capex,annualOpex}) {
 const values=[generationKwh,selfConsumedKwh,exportedKwh,buyRate,exportRate,capex,annualOpex];
 if(!values.every(v=>Number.isFinite(v)&&v>=0))throw new TypeError('finite nonnegative energy and monetary inputs required');
 if(selfConsumedKwh+exportedKwh>generationKwh+1e-9)throw new RangeError('self-use and exports exceed generation');
 const avoidedPurchase=selfConsumedKwh*buyRate,exportIncome=exportedKwh*exportRate;
 const annualNet=avoidedPurchase+exportIncome-annualOpex;
 const simplePaybackYears=annualNet>0?capex/annualNet:null;
 if(![avoidedPurchase,exportIncome,annualNet].every(Number.isFinite)||simplePaybackYears!==null&&!Number.isFinite(simplePaybackYears))throw new RangeError('calculation overflow');
 return {avoidedPurchase,exportIncome,annualNet,simplePaybackYears,unallocatedKwh:generationKwh-selfConsumedKwh-exportedKwh};
}
