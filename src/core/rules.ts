import { DEFAULT_LAPS } from './race-options';

/** Shared vehicle rules. Re-exported by simulation.ts; changing a value that alters results requires a version bump. */
export const RULES = Object.freeze({
  version: 18, dt: 1 / 60, laps: DEFAULT_LAPS,
  acceleration: 6, braking: 8.5, accelerationJerk: 14, paceResponse: 1.6, paceDeadband: 0.4,
  maxSpeed: 42, thrustAcceleration: 25, thrustDuration: 0.7, thrustRecharge: 5,
  hopRecharge: 7, hopLaunchSpeed: 34,
  flightLaunchCorrection: 20 * Math.PI / 180, flightTurnRate: 30 * Math.PI / 180,
  asphaltGrip: 48, dirtGrip: 38.4, sandGrip: 6.5, asphaltResponse: 7.5, sandResponse: 1.8, sandDrag: 0.95,
  snowGrip: 26.4, snowLooseGrip: 7.5, snowDrag: 1.1,
  steeringResponse: 4.8, steeringRate: 2.8, steeringSmoothing: 7,
  lookAhead: 4, lookAheadSeconds: 0.25, surfaceTransition: 1.2,
  driftStartAngle: 0.17, driftEndAngle: 0.09,
  driftGripLoss: 0.14, driftSaturationRange: 2,
  recoveryHold: 1, hazardApproach: 12, hazardPenaltySpeed: 20, repeatRecoveryWindow: 15,
});
