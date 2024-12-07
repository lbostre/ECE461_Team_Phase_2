export async function correctness(openIssues: number, closedIssues: number) {
	const clockStart = Date.now();
	const ratio = openIssues / (openIssues + closedIssues);
	const correctnessValue = 1 - ratio || 0;
	return { correctnessValue, correctnessLatency: (Date.now() - clockStart) / 1000 };
  }
  