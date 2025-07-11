import EmailService from "../src/services/EmailService.js";

async function advancedUsageExample() {
  console.log("=== Advanced Email Service Usage Example ===\n");

  const emailService = new EmailService({
    maxRetries: 2,
    initialRetryDelay: 500,
    maxRetryDelay: 5000,
  });

  emailService.providers[0].setFailureRate(0.3);
  emailService.providers[1].setFailureRate(0.2);

  console.log("--- Demonstrating Queue System ---");

  const emailsToQueue = [
    {
      to: "user1@example.com",
      subject: "Newsletter #1",
      body: "Monthly newsletter content",
    },
    {
      to: "user2@example.com",
      subject: "Newsletter #2",
      body: "Monthly newsletter content",
    },
    {
      to: "user3@example.com",
      subject: "Special Offer",
      body: "Limited time offer!",
    },
    {
      to: "user4@example.com",
      subject: "Account Update",
      body: "Your account has been updated",
    },
    {
      to: "user5@example.com",
      subject: "Welcome!",
      body: "Welcome to our platform",
    },
  ];

  console.log("Adding emails to queue...");
  for (const email of emailsToQueue) {
    await emailService.queueEmail(email);
  }

  let health = emailService.getServiceHealth();
  console.log(`Queued emails: ${health.queue.size}`);

  console.log("\nProcessing queue...");
  await emailService.processQueue();

  health = emailService.getServiceHealth();
  console.log(`Remaining in queue: ${health.queue.size}`);
  console.log(`Total emails processed: ${health.totalEmailsTracked}`);

  console.log("\n--- Demonstrating Rate Limiting ---");

  emailService.rateLimiter.configure(2, 5000);

  console.log(
    "Attempting to send 5 emails quickly (rate limit: 2 per 5 seconds)..."
  );

  const rapidEmails = [];
  for (let i = 1; i <= 5; i++) {
    rapidEmails.push({
      to: `rapid${i}@example.com`,
      subject: `Rapid Email ${i}`,
      body: "This is a rapid email test",
      id: `rapid-${i}`,
    });
  }

  const results = await Promise.all(
    rapidEmails.map((email) => emailService.sendEmail(email))
  );

  results.forEach((result, index) => {
    const status = result.success ? "✅" : "❌";
    const reason = result.status === "rate_limited" ? "(Rate Limited)" : "";
    console.log(`  Email ${index + 1}: ${status} ${result.status} ${reason}`);
  });

  console.log("\n--- Circuit Breaker Demonstration ---");

  console.log("Forcing provider failures to demonstrate circuit breaker...");
  emailService.providers[0].setFailureRate(1.0);
  emailService.providers[1].setFailureRate(1.0);

  emailService.rateLimiter.configure(100, 60000);

  for (let i = 1; i <= 8; i++) {
    const result = await emailService.sendEmail({
      to: `failure${i}@example.com`,
      subject: `Failure Test ${i}`,
      body: "This email will fail",
      id: `failure-${i}`,
    });

    console.log(
      `  Attempt ${i}: ${result.success ? "✅" : "❌"} ${result.status}`
    );
  }

  console.log("\nCircuit Breaker States:");
  health = emailService.getServiceHealth();
  health.providers.forEach((provider) => {
    console.log(
      `  ${provider.name}: ${provider.circuitBreakerState} (Healthy: ${provider.healthy})`
    );
  });

  console.log("\n--- Status Tracking ---");

  const allStatuses = emailService.getAllEmailStatuses();
  console.log(`Total tracked emails: ${allStatuses.length}`);

  console.log("\nLast 3 email statuses:");
  allStatuses.slice(-3).forEach((status, index) => {
    console.log(`\n  Email ${allStatuses.length - 2 + index}:`);
    console.log(`    ID: ${status.emailId}`);
    console.log(`    Status: ${status.status}`);
    console.log(`    Success: ${status.success}`);
    console.log(`    Attempts: ${status.attempts.length}`);
    if (status.attempts.length > 0) {
      const lastAttempt = status.attempts[status.attempts.length - 1];
      console.log(`    Last Provider: ${lastAttempt.provider || "N/A"}`);
      console.log(`    Last Attempt Status: ${lastAttempt.status}`);
    }
  });

  console.log("\n--- Final Service Health Report ---");
  health = emailService.getServiceHealth();

  console.log(`\nProviders:`);
  health.providers.forEach((provider) => {
    console.log(`  ${provider.name}:`);
    console.log(`    Circuit Breaker: ${provider.circuitBreakerState}`);
    console.log(`    Healthy: ${provider.healthy ? "✅" : "❌"}`);
  });

  console.log(`\nRate Limiter:`);
  console.log(
    `  Current Requests: ${health.rateLimiter.requestsInWindow}/${health.rateLimiter.limit}`
  );
  console.log(`  Window: ${health.rateLimiter.windowMs}ms`);

  console.log(`\nOverall Stats:`);
  console.log(`  Total Emails Sent: ${health.totalEmailsSent}`);
  console.log(`  Total Emails Tracked: ${health.totalEmailsTracked}`);
  console.log(`  Queue Size: ${health.queue.size}`);

  console.log("\n=== Advanced Example Complete ===");
}

advancedUsageExample().catch(console.error);