export async function licensing(license: string | null) {
    const licenseCompatabilityValue = license ? 1 : 0;
    return { licenseCompatabilityValue, licenseEnd: Date.now() };
}
  