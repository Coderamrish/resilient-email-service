/**
 * EmailService Unit Tests
 * 
 * Comprehensive test suite for the EmailService class
 */

import EmailService from '../src/services/EmailService.js';
import MockEmailProvider1 from '../src/providers/MockEmailProvider1.js';
import MockEmailProvider2 from '../src/providers/MockEmailProvider2.js';

// Mock console to avoid test output pollution
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.debug = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

describe('EmailService', () => {
  let emailService;
  const validEmail = {
    to: 'test@example.com',
    subject: 'Test Subject',
    body: 'Test Body'
  };

  beforeEach(() => {
    emailService = new EmailService({
      maxRetries: 2,
      initialRetryDelay: 10, // Faster for testing
      maxRetryDelay: 100
    });
  });

  afterEach(() => {
    emailService.reset();
  });

  describe('Email Sending', () => {
    test('should send email successfully with first provider', async () => {
      // Set both providers to always succeed
      emailService.providers[0].setFailureRate(0);
      emailService.providers[1].setFailureRate(0);

      const result = await emailService.sendEmail(validEmail);

      expect(result.success).toBe(true);
      expect(result.status).toBe('sent');
      expect(result.provider).toBe('MockProvider1');
      expect(result.messageId).toBeDefined();
    });

    test('should handle provider validation errors', async () => {
      const invalidEmail = {
        to: 'invalid-email',
        subject: '',
        body: ''
      };

      const result = await emailService.sendEmail(invalidEmail);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
    });

    test('should retry on failure and eventually succeed', async () => {
      // Make first provider fail once, then succeed
      let attemptCount = 0;
      const originalSend = emailService.providers[0].sendEmail.bind(emailService.providers[0]);
      emailService.providers[0].sendEmail = async (emailData) => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Temporary failure');
        }
        return originalSend(emailData);
      };

      const result = await emailService.sendEmail(validEmail);

      expect(result.success).toBe(true);
      expect(result.attempts.length).toBeGreaterThan(1);
    });

    test('should fallback to second provider when first fails', async () => {
      // Make first provider always fail
      emailService.providers[0].setFailureRate(1);
      emailService.providers[1].setFailureRate(0);

      const result = await emailService.sendEmail(validEmail);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('MockProvider2');
    });

    test('should fail when all providers and retries are exhausted', async () => {
      // Make both providers always fail
      emailService.providers[0].setFailureRate(1);
      emailService.providers[1].setFailureRate(1);

      const result = await emailService.sendEmail(validEmail);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.attempts.length).toBeGreaterThan(0);
    });
  });

  describe('Idempotency', () => {
    test('should prevent duplicate sends with same email ID', async () => {
      emailService.providers[0].setFailureRate(0);

      const emailWithId = { ...validEmail, id: 'test-123' };

      // Send first email
      const result1 = await emailService.sendEmail(emailWithId);
      expect(result1.success).toBe(true);

      // Attempt to send same email again
      const result2 = await emailService.sendEmail(emailWithId);
      expect(result2.status).toBe('already_sent');
      expect(result2.success).toBe(true);
    });

    test('should allow different emails with different IDs', async () => {
      emailService.providers[0].setFailureRate(0);

      const email1 = { ...validEmail, id: 'test-123' };
      const email2 = { ...validEmail, id: 'test-456' };

      const result1 = await emailService.sendEmail(email1);
      const result2 = await emailService.sendEmail(email2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.status).toBe('sent');
      expect(result2.status).toBe('sent');
    });
  });

  describe('Rate Limiting', () => {
    test('should respect rate limits', async () => {
      // Create service with low rate limit for testing
      const limitedService = new EmailService({
        maxRetries: 1,
        initialRetryDelay: 10
      });
      
      // Set very restrictive rate limit (1 email per minute)
      limitedService.rateLimiter.configure(1, 60000);
      limitedService.providers[0].setFailureRate(0);

      // First email should succeed
      const result1 = await limitedService.sendEmail({ ...validEmail, id: 'test-1' });
      expect(result1.success).toBe(true);

      // Second email should be rate limited
      const result2 = await limitedService.sendEmail({ ...validEmail, id: 'test-2' });
      expect(result2.success).toBe(false);
      expect(result2.status).toBe('rate_limited');

      limitedService.reset();
    });
  });

  describe('Status Tracking', () => {
    test('should track email status throughout sending process', async () => {
      emailService.providers[0].setFailureRate(0);

      const emailWithId = { ...validEmail, id: 'status-test' };
      await emailService.sendEmail(emailWithId);

      const status = emailService.getEmailStatus('status-test');

      expect(status).toBeDefined();
      expect(status.emailId).toBe('status-test');
      expect(status.success).toBe(true);
      expect(status.attempts).toBeDefined();
      expect(status.attempts.length).toBeGreaterThan(0);
    });

    test('should return null for non-existent email status', () => {
      const status = emailService.getEmailStatus('non-existent');
      expect(status).toBeNull();
    });

    test('should return all email statuses', async () => {
      emailService.providers[0].setFailureRate(0);

      await emailService.sendEmail({ ...validEmail, id: 'test-1' });
      await emailService.sendEmail({ ...validEmail, id: 'test-2' });

      const allStatuses = emailService.getAllEmailStatuses();
      expect(allStatuses.length).toBe(2);
    });
  });

  describe('Queue System', () => {
    test('should queue emails for later processing', async () => {
      const emailId = await emailService.queueEmail(validEmail);
      expect(emailId).toBeDefined();

      const health = emailService.getServiceHealth();
      expect(health.queue.size).toBe(1);
      expect(health.queue.isEmpty).toBe(false);
    });

    test('should process queued emails', async () => {
      emailService.providers[0].setFailureRate(0);

      await emailService.queueEmail({ ...validEmail, id: 'queued-1' });
      await emailService.queueEmail({ ...validEmail, id: 'queued-2' });

      expect(emailService.getServiceHealth().queue.size).toBe(2);

      await emailService.processQueue();

      expect(emailService.getServiceHealth().queue.isEmpty).toBe(true);
      expect(emailService.getEmailStatus('queued-1')).toBeDefined();
      expect(emailService.getEmailStatus('queued-2')).toBeDefined();
    });
  });

  describe('Service Health', () => {
    test('should provide service health information', () => {
      const health = emailService.getServiceHealth();

      expect(health.providers).toBeDefined();
      expect(health.providers.length).toBe(2);
      expect(health.rateLimiter).toBeDefined();
      expect(health.queue).toBeDefined();
      expect(health.totalEmailsSent).toBeDefined();
      expect(health.totalEmailsTracked).toBeDefined();
    });

    test('should reflect circuit breaker states in health', async () => {
      // Cause circuit breaker to open by making provider fail repeatedly
      emailService.providers[0].setFailureRate(1);
      emailService.providers[1].setFailureRate(1);

      // Send multiple emails to trip circuit breaker
      for (let i = 0; i < 6; i++) {
        await emailService.sendEmail({ ...validEmail, id: `test-${i}` });
      }

      const health = emailService.getServiceHealth();
      const provider1Health = health.providers.find(p => p.name === 'MockProvider1');
      
      // Circuit breaker should be open or have recorded failures
      expect(provider1Health.circuitBreakerState).toBeDefined();
    });
  });

  describe('Circuit Breaker Integration', () => {
    test('should open circuit breaker after threshold failures', async () => {
      // Make provider always fail
      emailService.providers[0].setFailureRate(1);
      emailService.providers[1].setFailureRate(1);

      // Send enough emails to trip circuit breaker (threshold is 5)
      for (let i = 0; i < 6; i++) {
        await emailService.sendEmail({ ...validEmail, id: `cb-test-${i}` });
      }

      const health = emailService.getServiceHealth();
      const circuitBreakerStates = health.providers.map(p => p.circuitBreakerState);
      
      // At least one circuit breaker should be open
      expect(circuitBreakerStates.some(state => state === 'OPEN')).toBe(true);
    });
  });

  describe('Service Reset', () => {
    test('should reset all service state', async () => {
      emailService.providers[0].setFailureRate(0);

      // Add some state
      await emailService.sendEmail({ ...validEmail, id: 'reset-test' });
      await emailService.queueEmail(validEmail);

      expect(emailService.getServiceHealth().totalEmailsSent).toBe(1);
      expect(emailService.getServiceHealth().totalEmailsTracked).toBe(1);
      expect(emailService.getServiceHealth().queue.size).toBe(1);

      // Reset service
      emailService.reset();

      const health = emailService.getServiceHealth();
      expect(health.totalEmailsSent).toBe(0);
      expect(health.totalEmailsTracked).toBe(0);
      expect(health.queue.isEmpty).toBe(true);
    });
  });
});

describe('MockEmailProvider1', () => {
  let provider;

  beforeEach(() => {
    provider = new MockEmailProvider1();
  });

  test('should validate email data', async () => {
    const invalidEmails = [
      null,
      { to: 'invalid-email' },
      { to: 'test@example.com', subject: '' },
      { to: 'test@example.com', subject: 'Test', body: '' }
    ];

    for (const invalidEmail of invalidEmails) {
      await expect(provider.sendEmail(invalidEmail)).rejects.toThrow();
    }
  });

  test('should succeed with valid email data', async () => {
    provider.setFailureRate(0);

    const result = await provider.sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body'
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.provider).toBe('MockProvider1');
  });

  test('should respect configured failure rate', async () => {
    provider.setFailureRate(1); // 100% failure rate

    await expect(provider.sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body'
    })).rejects.toThrow();
  });

  test('should provide status information', () => {
    const status = provider.getStatus();
    expect(status.name).toBe('MockProvider1');
    expect(status.failureRate).toBeDefined();
    expect(status.latencyRange).toBeDefined();
    expect(status.healthy).toBe(true);
  });
});

describe('MockEmailProvider2', () => {
  let provider;

  beforeEach(() => {
    provider = new MockEmailProvider2();
  });

  test('should have additional validation rules', async () => {
    const longSubject = 'x'.repeat(201);
    const longBody = 'x'.repeat(10001);

    await expect(provider.sendEmail({
      to: 'test@example.com',
      subject: longSubject,
      body: 'Test Body'
    })).rejects.toThrow('Subject too long');

    await expect(provider.sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      body: longBody
    })).rejects.toThrow('Body too long');
  });

  test('should work with valid data within limits', async () => {
    provider.setFailureRate(0);

    const result = await provider.sendEmail({
      to: 'test@example.com',
      subject: 'Valid Subject',
      body: 'Valid body content'
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('MockProvider2');
  });
});