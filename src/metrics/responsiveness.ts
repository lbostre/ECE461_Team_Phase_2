export async function responsiveness(issueDurations: number[]) {
  const sum = issueDurations.reduce((a, b) => a + b, 0);
  const average = sum / issueDurations.length;
  const responsivenessValue = 1 - (average / 365) || 0;
  return { responsivenessValue, responsivenessEnd: Date.now() };
}
