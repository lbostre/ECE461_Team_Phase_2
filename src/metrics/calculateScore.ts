const WEIGHT_BUS_FACTOR = 0.22;
const WEIGHT_RESPONSIVENESS = 0.2;
const WEIGHT_CORRECTNESS = 0.2;
const WEIGHT_RAMP_UP_TIME = 0.2;
const WEIGHT_LICENSING = 0.2;

export async function calculateScore(busFactorValue: number, responsivenessValue: number, correctnessValue: number, rampUpTimeValue: number, licensingValue: number) {
  const weightedSum = (
    busFactorValue * WEIGHT_BUS_FACTOR +
    responsivenessValue * WEIGHT_RESPONSIVENESS +
    correctnessValue * WEIGHT_CORRECTNESS +
    rampUpTimeValue * WEIGHT_RAMP_UP_TIME +
    licensingValue * WEIGHT_LICENSING
  );
  const sumWeights = WEIGHT_BUS_FACTOR + WEIGHT_RESPONSIVENESS + WEIGHT_CORRECTNESS + WEIGHT_RAMP_UP_TIME + WEIGHT_LICENSING;
  return weightedSum / sumWeights;
}
