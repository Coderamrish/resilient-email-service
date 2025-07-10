/**
 * Advanced Usage Example
 * 
 * Demonstrates advanced features like queuing, batch processing,
 * and monitoring circuit breakers
 */

import EmailService from '../src/services/EmailService.js';

async function advancedUsageExample() {
  console.log('=== Advanced Email Service Usage Example ===\n');

  // Create email service with custom configuration
  const emailService = new EmailService({
    maxRetries: 2,
    initialRetryDelay: 500,
    maxRetryDelay: 5000
  });

  // Configure providers for demonstration (make them fail occasionally)
  emailService.providers[0].setFailureRate(0.3); // 30% failure rate
  emailService.providers[1].setFailureRate(0.2); // 20% failure rate

  console.log('--- Demonstrating Queue System ---');

  // Add emails to queue
  const emailsToQueue = [
    { to: 'user1@example.com', subject: 'Newsletter #1', body: 'Monthly newsletter content' },
    { to: 'user2@example.com', subject: 'Newsletter #2', body: 'Monthly newsletter content' },
    { to: 'user3@example.com', subject: 'Special Offer', body: 'Limited time offer!' },
    { to: 'user4@example.com', subject: 'Account Update', body: 'Your account has been updated' },
    { to: 'user5@example.com', subject: 'Welcome!', body: 'Welcome to our platform' }
  ];

  console.log('Adding emails to queue...');
  for (const email of emailsToQueue) {
    await emailService.queueEmail(email);
  }

  let health = emailService.getServiceHealth();
  console.log(`Queued emails: ${health.queue.size}`);

  console.log('\nProcessing queue...');
  await emailService.processQueue();

  health = emailService.getServiceHealth();
  console.log(`Remaining in queue: ${health.queue.size}`);
  console.log(`Total emails processed: ${health.totalEmailsTracked}`);

  console.log('\n--- Demonstrating Rate Limiting ---');

  // Temporarily set a very low rate limit for demonstration
  emailService.rateLimiter.configure(2, 5000); // 2 emails per 5 seconds

  console.log('Attempting to send 5 emails quickly (rate limit: 2 per 5 seconds)...');
  
  const rapidEmails = [];
  for (let i = 1; i <= 5; i++) {
    rapidEmails.push({
      to: `rapid${i}@example.com`,
      subject: `Rapid Email ${i}`,
      body: 'This is a rapid email test',
      id: `rapid-${i}`
    });
  }

  const results = await Promise.all(
    rapidEmails.map(email => emailService.sendEmail(email))
  );

  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const reason = result.status === 'rate_limited' ? '(Rate Limited)' : '';
    console.log(`  Email ${index + 1}: ${status} ${result.status} ${reason}`);
  });

  console.log('\n--- Circuit Breaker Demonstration ---');

  // Force circuit breaker to trip by making providers fail
  console.log('Forcing provider failures to demonstrate circuit breaker...');
  emailService.providers[0].setFailureRate(1.0); // 100% failure rate
  emailService.providers[1].setFailureRate(1.0); // 100% failure rate

  // Reset rate limiter for this test
  emailService.rateLimiter.configure(100, 60000);

  // Send emails that will fail and trip circuit breakers
  for (let i = 1; i <= 8; i++) {
    const result = await emailService.sendEmail({
      to: `failure${i}@example.com`,
      subject: `Failure Test ${i}`,
      body: 'This email will fail',
      id: `failure-${i}`
    });
    
    console.log(`  Attempt ${i}: ${result.success ? '✅' : '❌'} ${result.status}`);
  }

  // Check circuit breaker states
  console.log('\nCircuit Breaker States:');
  health = emailService.getServiceHealth();
  health.providers.forEach(provider => {
    console.log(`  ${provider.name}: ${provider.circuitBreakerState} (Healthy: ${provider.healthy})`);
  });

  console.log('\n--- Status Tracking ---');

  // Show detailed status for some emails
  const allStatuses = emailService.getAllEmailStatuses();
  console.log(`Total tracked emails: ${allStatuses.length}`);

  // Show last 3 email statuses
  console.log('\nLast 3 email statuses:');
  allStatuses.slice(-3).forEach((status, index) => {
    console.log(`\n  Email ${allStatuses.length - 2 + index}:`);
    console.log(`    ID: ${status.emailId}`);
    console.log(`    Status: ${status.status}`);
    console.log(`    Success: ${status.success}`);
    console.log(`    Attempts: ${status.attempts.length}`);
    if (status.attempts.length > 0) {
      const lastAttempt = status.attempts[status.attempts.length - 1];
      console.log(`    Last Provider: ${lastAttempt.provider || 'N/A'}`);
      console.log(`    Last Attempt Status: ${lastAttempt.status}`);
    }
  });

  console.log('\n--- Final Service Health Report ---');
  health = emailService.getServiceHealth();
  
  console.log(`\nProviders:`);
  health.providers.forEach(provider => {
    console.log(`  ${provider.name}:`);
    console.log(`    Circuit Breaker: ${provider.circuitBreakerState}`);
    console.log(`    Healthy: ${provider.healthy ? '✅' : '❌'}`);
  });

  console.log(`\nRate Limiter:`);
  console.log(`  Current Requests: ${health.rateLimiter.requestsInWindow}/${health.rateLimiter.limit}`);
  console.log(`  Window: ${health.rateLimiter.windowMs}ms`);

  console.log(`\nOverall Stats:`);
  console.log(`  Total Emails Sent: ${health.totalEmailsSent}`);
  console.log(`  Total Emails Tracked: ${health.totalEmailsTracked}`);
  console.log(`  Queue Size: ${health.queue.size}`);

  console.log('\n=== Advanced Example Complete ===');
}

// Run the example
advancedUsageExample().catch(console.error);