export const ACCUMULATION = 0.975;

export async function busFactor(uniqueContributors: any[]) {
  uniqueContributors.sort((a: number[], b: number[]) => b[1] - a[1]);
  
  let totalContributors = uniqueContributors.length;
  let totalCommits = uniqueContributors.reduce((sum, [, commits]) => sum + commits, 0);
  let cumulativeCommits = 0, cumulativeContributors = 0;

  for (const [, commits] of uniqueContributors) {
    cumulativeCommits += commits;
    cumulativeContributors++;
    if (cumulativeCommits >= totalCommits * ACCUMULATION) break;
  }

  return { busFactorValue: cumulativeContributors / totalContributors, busFactorEnd: Date.now() };
}
