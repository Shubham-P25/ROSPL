/**
 * lib/withFallback.js
 * Executes a prioritized chain of functions (e.g. live API -> cache -> seed).
 * Times out each attempt, retries on error, validates output.
 */
async function withFallback(
  chain,
  {
    timeoutMs = 4000,
    retries = 1,
    validate = (x) => Array.isArray(x) && x.length > 0,
  } = {},
) {
  const errors = [];
  for (const [i, fn] of chain.entries()) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      let timer;
      try {
        const res = await Promise.race([
          fn(),
          new Promise((_, rej) => {
            timer = setTimeout(() => rej(new Error("timeout")), timeoutMs);
          }),
        ]);
        clearTimeout(timer);
        if (validate(res)) {
          return { data: res, degraded: i > 0, errors };
        }
        errors.push(`step ${i}: empty/invalid result`);
        break; // do not retry an empty or invalid result from the same provider
      } catch (e) {
        clearTimeout(timer);
        errors.push(`step ${i} attempt ${attempt}: ${e.message}`);
      }
    }
  }
  return { data: [], degraded: true, errors };
}

module.exports = {
  withFallback,
};
