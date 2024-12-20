import * as fs from 'fs';

export async function rampUpTime(readme: fs.PathLike | null) {
  const clockStart = Date.now();
  if (!readme) throw new Error('Readme file not found');
  const readmeContent = await fs.promises.readFile(readme, 'utf8');
  const headings = [/installation/i, /usage/i, /configuration/i, /(faq|help)/i, /resources/i];
  
  const rampUpTimeValue = headings.filter(heading => heading.test(readmeContent)).length / headings.length;
  return { rampUpTimeValue, rampUpTimeLatency: (Date.now() - clockStart) / 1000 };
}
