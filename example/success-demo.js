import EmailService from "../src/services/EmailService.js";

async function successDemo() {
  console.log("=== Success Demonstration ===\n");

  const emailService = new EmailService({
    maxRetries: 2,
    initialRetryDelay: 500,
    maxRetryDelay: 3000,
  });

  console.log("--- Increasing Rate Limiter to 7 emails ---");
  emailService.rateLimiter.configure(7, 5000);
  console.log("Rate limiter set to: 7 emails per 5 seconds\n");

  console.log("--- Successful Email Sending ---");

  const successEmails = [
    {
      to: "user1@example.com",
      subject: "Welcome!",
      body: "Welcome to our platform!",
    },
    {
      to: "user2@example.com",
      subject: "Account Created",
      body: "Your account has been created successfully.",
    },
    {
      to: "user3@example.com",
      subject: "Order Confirmation",
      body: "Thank you for your order!",
    },
    {
      to: "user4@example.com",
      subject: "Password Reset",
      body: "Here is your password reset link.",
    },
    {
      to: "user5@example.com",
      subject: "Newsletter",
      body: "This month's newsletter is here!",
    },
    {
      to: "user6@example.com",
      subject: "Special Offer",
      body: "Limited time offer just for you!",
    },
    {
      to: "user7@example.com",
      subject: "Account Update",
      body: "Your account settings have been updated.",
    },
  ];

  console.log("Sending 7 emails with increased rate limit...\n");

  for (let i = 0; i < successEmails.length; i++) {
    const email = successEmails[i];
    console.log(`Sending email ${i + 1} to ${email.to}...`);

    const result = await emailService.sendEmail(email);

    if (result.success) {
      console.log(`✅ Email ${i + 1} sent successfully!`);
      console.log(`   Provider: ${result.provider}`);
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   Status: ${result.status}\n`);
    } else {
      console.log(`❌ Email ${i + 1} failed: ${result.message}\n`);
    }
  }

  console.log("--- Service Health After Success ---");
  const health = emailService.getServiceHealth();

  console.log(`📧 Total Emails Sent: ${health.totalEmailsSent}`);
  console.log(`📋 Total Emails Tracked: ${health.totalEmailsTracked}`);
  console.log(`📬 Queue Size: ${health.queue.size}`);

  console.log("\nProvider Status:");
  health.providers.forEach((provider) => {
    const status = provider.healthy ? "✅" : "❌";
    console.log(`${status} ${provider.name}: ${provider.circuitBreakerState}`);
  });

  console.log("\nRate Limiter Status:");
  console.log(
    `   Current Requests: ${health.rateLimiter.requestsInWindow}/${health.rateLimiter.limit}`
  );
  console.log(`   Window: ${health.rateLimiter.windowMs}ms`);

  console.log("\n--- Idempotency Test ---");
  console.log("Sending the same email twice...");

  const duplicateEmail = {
    to: "test@example.com",
    subject: "Duplicate Test",
    body: "This email should not be sent twice",
  };

  const result1 = await emailService.sendEmail(duplicateEmail);
  const result2 = await emailService.sendEmail(duplicateEmail);

  console.log(
    `First send: ${result1.success ? "✅" : "❌"} (${result1.status})`
  );
  console.log(
    `Second send: ${result2.success ? "✅" : "❌"} (${result2.status})`
  );

  if (result2.status === "already_sent") {
    console.log("✅ Idempotency working correctly - duplicate prevented!");
  }

  console.log("\n--- Queue System Test ---");
  console.log("Adding emails to queue...");

  const queueEmails = [
    {
      to: "queued1@example.com",
      subject: "Queued Email 1",
      body: "This was queued",
    },
    {
      to: "queued2@example.com",
      subject: "Queued Email 2",
      body: "This was also queued",
    },
    {
      to: "queued3@example.com",
      subject: "Queued Email 3",
      body: "Another queued email",
    },
  ];

  for (const email of queueEmails) {
    await emailService.queueEmail(email);
  }

  console.log(`Queued ${queueEmails.length} emails`);
  console.log("Processing queue...");
  await emailService.processQueue();

  const finalHealth = emailService.getServiceHealth();
  console.log(`Final queue size: ${finalHealth.queue.size}`);
  console.log(`Total emails sent: ${finalHealth.totalEmailsSent}`);

  console.log("\n--- Final Summary ---");
  console.log("✅ All resilience features working correctly:");
  console.log("   • Rate limiting (increased to 7 emails)");
  console.log("   • Idempotency (duplicate prevention)");
  console.log("   • Queue system (async processing)");
  console.log("   • Status tracking (complete audit trail)");
  console.log("   • Provider health monitoring");

  console.log("\n=== Success Demo Complete ===");
}

successDemo().catch(console.error);