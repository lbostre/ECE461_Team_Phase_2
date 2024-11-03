export async function correctness(openIssues: number, closedIssues: number) {
	const ratio = openIssues / (openIssues + closedIssues);
	const correctnessValue = 1 - ratio || 0;
	return { correctnessValue, correctnessEnd: Date.now() };
  }
  