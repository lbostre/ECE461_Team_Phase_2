export async function responsiveness(issueDurations: number[]) {
  const clockStart = Date.now();
  if (issueDurations.length === 0) {
    return { responsivenessValue: 1, responsivenessLatency: (Date.now() - clockStart) / 1000 };
  }
  const sum = issueDurations.reduce((a, b) => a + b, 0);
  const average = sum / issueDurations.length;
  const responsivenessValue = Math.max(1 - (average / 365), 0);
  return { responsivenessValue, responsivenessLatency: (Date.now() - clockStart) / 1000 };
}
