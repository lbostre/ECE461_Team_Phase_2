export async function responsiveness(issueDurations: number[]) {
  if (issueDurations.length === 0) {
    return { responsivenessValue: 1, responsivenessEnd: Date.now() };
  }
  const sum = issueDurations.reduce((a, b) => a + b, 0);
  const average = sum / issueDurations.length;
  const responsivenessValue = Math.max(1 - (average / 365), 0);
  return { responsivenessValue, responsivenessEnd: Date.now() };
}
