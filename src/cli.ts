import { getRepoData } from './metrics';
import * as fs from 'fs';
import * as readline from 'readline';

// Function to read URLs from the file
async function readUrlsFromFile(filePath: string): Promise<string[]> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const urls: string[] = [];
  for await (const line of rl) {
    if (line.trim()) {
      urls.push(line.trim()); // Add the URL if the line is not empty
    }
  }

  return urls;
}

// Function to format and round the metrics, with NetScore at the end
const formatMetrics = (url: string, metrics: any) => ({
  URL: url,
  NetScore: parseFloat(metrics.score.toFixed(1)),
  NetScore_Latency: parseFloat(metrics.scoreLatency.toFixed(3)),
  RampUp: parseFloat(metrics.rampUpTimeValue.toFixed(1)),
  RampUp_Latency: parseFloat(metrics.rampUpTimeLatency.toFixed(3)),
  Correctness: parseFloat(metrics.correctnessValue.toFixed(1)),
  Correctness_Latency: parseFloat(metrics.correctnessLatency.toFixed(3)),
  BusFactor: parseFloat(metrics.busFactorValue.toFixed(1)),
  BusFactor_Latency: parseFloat(metrics.busFactorLatency.toFixed(3)),
  ResponsiveMaintainer: parseFloat(metrics.responsivenessValue.toFixed(1)),
  ResponsiveMaintainer_Latency: parseFloat(metrics.responsivenessLatency.toFixed(3)),
  License: parseFloat(metrics.licenseCompatabilityValue.toFixed(1)),
  License_Latency: parseFloat(metrics.licenseCompatabilityLatency.toFixed(3))
});

// Main function to read URLs, get metrics, and write them to NDJSON
async function writeMetricsToFile(filePath: string) {
  const urls = await readUrlsFromFile(filePath);
  const outputFilePath = 'output.json';
  const writeStream = fs.createWriteStream(outputFilePath, { flags: 'a' });

  for (const url of urls) {
    try {
      const metrics = await getRepoData(url);
      const formattedMetrics = formatMetrics(url, metrics);
      writeStream.write(JSON.stringify(formattedMetrics) + '\n');
    } catch (error) {
      console.error(`Failed to fetch metrics for ${url}:`, error);
    }
  }

  writeStream.end();
  //console.log('Metrics written to', outputFilePath);
}

// Function to handle test mode
function Test() {
  console.log('Running in test mode...');
  // You can define test logic here
}

// Main function to validate input and run the script
function main() {
  const inputArg = process.argv[2];

  if (inputArg === 'test') {
    Test();
  } else if (fs.existsSync(inputArg)) {
    writeMetricsToFile(inputArg).catch(console.error);
  } else {
    console.error('Invalid command. Please provide a valid file path or use the word "test" as input.');
    process.exit(1);
  }
}

// Entry point of the script
main();