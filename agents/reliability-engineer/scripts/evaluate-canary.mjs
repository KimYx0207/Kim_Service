// A decision helper for observed request counts, not a traffic-switching tool.
export function evaluateCanary({requests,errors,minRequests,maxErrorRate,observationAvailable=true,criticalFailure=false}) {
 if(!Number.isSafeInteger(requests)||requests<0||!Number.isSafeInteger(errors)||errors<0||errors>requests||!Number.isSafeInteger(minRequests)||minRequests<1||!Number.isFinite(maxErrorRate)||maxErrorRate<0||maxErrorRate>1)throw new TypeError('valid counts and policy thresholds required');
 if(typeof observationAvailable!=='boolean'||typeof criticalFailure!=='boolean')throw new TypeError('observation and critical failure flags must be booleans');
 if(criticalFailure)return {decision:'rollback_candidate',reason:'critical_failure',errorRate:requests?errors/requests:null};
 if(!observationAvailable)return {decision:'observe',reason:'missing_observation',errorRate:null};
 if(requests===0)return {decision:'observe',reason:'no_requests',errorRate:null};
 const errorRate=errors/requests;
 if(requests<minRequests)return {decision:'observe',reason:'insufficient_requests',errorRate};
 if(errorRate>maxErrorRate)return {decision:'rollback_candidate',reason:'error_rate_exceeded',errorRate};
 return {decision:'eligible_for_next_stage',reason:'observed_threshold_met',errorRate};
}
