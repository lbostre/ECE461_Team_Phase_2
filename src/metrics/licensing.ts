export async function licensing(license: string | null) {
    const clockStart = Date.now();
    const licenseCompatabilityValue = license ? 1 : 0;
    return { licenseCompatabilityValue, licenseLatency: (Date.now() - clockStart) / 1000 };
}
  