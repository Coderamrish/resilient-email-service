import EmailService from "./src/services/EmailService.js";
import MockEmailProvider1 from "./src/providers/MockEmailProvider1.js";
import MockEmailProvider2 from "./src/providers/MockEmailProvider2.js";
import CircuitBreaker from "./src/utils/CircuitBreaker.js";
import RateLimiter from "./src/utils/RateLimiter.js";
import Logger from "./src/utils/Logger.js";
import EmailQueue from "./src/utils/Emailqueue.js";

export default EmailService;

export {
  EmailService,
  MockEmailProvider1,
  MockEmailProvider2,
  CircuitBreaker,
  RateLimiter,
  Logger,
  EmailQueue,
};

export function createEmailService(options = {}) {
  return new EmailService(options);
}

export const configs = {
  development: {
    maxRetries: 2,
    initialRetryDelay: 500,
    maxRetryDelay: 5000,
  },
  production: {
    maxRetries: 3,
    initialRetryDelay: 1000,
    maxRetryDelay: 30000,
  },
  highVolume: {
    maxRetries: 1,
    initialRetryDelay: 200,
    maxRetryDelay: 2000,
  },
};

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("=== Resilient Email Service ===");
  console.log("Usage:");
  console.log('  import EmailService from "resilient-email-service";');
  console.log("  const emailService = new EmailService();");
  console.log("  await emailService.sendEmail({ to, subject, body });");
  console.log("");
  console.log("For more examples, see the example/ directory.");
}