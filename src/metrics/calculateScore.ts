const WEIGHT_BUS_FACTOR = 0.2;
const WEIGHT_RESPONSIVENESS = 0.18;
const WEIGHT_CORRECTNESS = 0.18;
const WEIGHT_RAMP_UP_TIME = 0.14;
const WEIGHT_LICENSING = 0.14;
const WEIGHT_GOOD_PINNING_PRACTICE = 0.1; // New weight for dependency pinning
const WEIGHT_PULL_REQUEST = 0.06;         // New weight for code review coverage

export async function calculateScore(
  busFactorValue: number,
  responsivenessValue: number,
  correctnessValue: number,
  rampUpTimeValue: number,
  licensingValue: number,
  goodPinningPracticeValue: number, // New parameter
  pullRequestValue: number          // New parameter
): Promise<number> {
  const weightedSum = (
    busFactorValue * WEIGHT_BUS_FACTOR +
    responsivenessValue * WEIGHT_RESPONSIVENESS +
    correctnessValue * WEIGHT_CORRECTNESS +
    rampUpTimeValue * WEIGHT_RAMP_UP_TIME +
    licensingValue * WEIGHT_LICENSING +
    goodPinningPracticeValue * WEIGHT_GOOD_PINNING_PRACTICE + // Include new metric
    pullRequestValue * WEIGHT_PULL_REQUEST                   // Include new metric
  );

  const sumWeights = WEIGHT_BUS_FACTOR +
    WEIGHT_RESPONSIVENESS +
    WEIGHT_CORRECTNESS +
    WEIGHT_RAMP_UP_TIME +
    WEIGHT_LICENSING +
    WEIGHT_GOOD_PINNING_PRACTICE +
    WEIGHT_PULL_REQUEST;

  return weightedSum / sumWeights;
}
