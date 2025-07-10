/**
 * Basic Usage Example
 * 
 * Demonstrates how to use the EmailService for basic email sending
 */

import EmailService from '../src/services/EmailService.js';

async function basicUsageExample() {
  console.log('=== Basic Email Service Usage Example ===\n');

  // Create email service instance
  const emailService = new EmailService({
    maxRetries: 3,
    initialRetryDelay: 1000,
    maxRetryDelay: 10000
  });

  // Example email data
  const emailData = {
    to: 'user@example.com',
    subject: 'Welcome to Our Service',
    body: 'Thank you for signing up! We are excited to have you on board.'
  };

  try {
    console.log('Sending email...');
    const result = await emailService.sendEmail(emailData);

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log(`   Provider: ${result.provider}`);
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   Status: ${result.status}`);
    } else {
      console.log('❌ Email failed to send');
      console.log(`   Status: ${result.status}`);
      console.log(`   Message: ${result.message}`);
    }

    // Check email status
    console.log('\n--- Email Status ---');
    const status = emailService.getEmailStatus(result.emailId);
    console.log(`Email ID: ${status.emailId}`);
    console.log(`Attempts: ${status.attempts.length}`);
    console.log(`Final Status: ${status.status}`);

  } catch (error) {
    console.error('Error sending email:', error.message);
  }

  // Service health check
  console.log('\n--- Service Health ---');
  const health = emailService.getServiceHealth();
  console.log(`Total emails sent: ${health.totalEmailsSent}`);
  console.log(`Provider statuses:`);
  health.providers.forEach(provider => {
    console.log(`  ${provider.name}: ${provider.healthy ? '✅' : '❌'} (${provider.circuitBreakerState})`);
  });

  console.log('\n=== Example Complete ===');
}

// Run the example
basicUsageExample().catch(console.error);