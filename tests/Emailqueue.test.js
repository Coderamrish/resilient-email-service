/**
 * EmailQueue Unit Tests
 */

import EmailQueue from '../src/utils/Emailqueue.js';

describe('EmailQueue', () => {
  let queue;

  beforeEach(() => {
    queue = new EmailQueue();
  });

  describe('Basic operations', () => {
    test('should start empty', () => {
      expect(queue.isEmpty()).toBe(true);
      expect(queue.size()).toBe(0);
    });

    test('should add and retrieve emails in FIFO order', async () => {
      const email1 = { to: 'test1@example.com', subject: 'Test 1', body: 'Body 1' };
      const email2 = { to: 'test2@example.com', subject: 'Test 2', body: 'Body 2' };

      await queue.add(email1);
      await queue.add(email2);

      expect(queue.size()).toBe(2);
      expect(queue.isEmpty()).toBe(false);

      const retrieved1 = await queue.next();
      const retrieved2 = await queue.next();

      expect(retrieved1).toEqual(email1);
      expect(retrieved2).toEqual(email2);
      expect(queue.isEmpty()).toBe(true);
    });

    test('should return null when getting from empty queue', async () => {
      const result = await queue.next();
      expect(result).toBeNull();
    });

    test('should peek without removing', () => {
      const email = { to: 'test@example.com', subject: 'Test', body: 'Body' };
      queue.add(email);

      const peeked = queue.peek();
      expect(peeked).toEqual(email);
      expect(queue.size()).toBe(1); // Should not remove

      const retrieved = queue.next();
      expect(retrieved).toEqual(email);
      expect(queue.isEmpty()).toBe(true);
    });

    test('should return null when peeking empty queue', () => {
      const result = queue.peek();
      expect(result).toBeNull();
    });
  });

  describe('Priority handling', () => {
    test('should handle priority ordering', async () => {
      const lowPriority = { to: 'low@example.com', subject: 'Low Priority', body: 'Body' };
      const highPriority = { to: 'high@example.com', subject: 'High Priority', body: 'Body' };
      const mediumPriority = { to: 'medium@example.com', subject: 'Medium Priority', body: 'Body' };

      await queue.add(lowPriority, 10);    // Lower number = higher priority
      await queue.add(highPriority, 1);
      await queue.add(mediumPriority, 5);

      const first = await queue.next();
      const second = await queue.next();
      const third = await queue.next();

      expect(first).toEqual(highPriority);
      expect(second).toEqual(mediumPriority);
      expect(third).toEqual(lowPriority);
    });

    test('should maintain FIFO for same priority items', async () => {
      const email1 = { to: 'test1@example.com', subject: 'First', body: 'Body' };
      const email2 = { to: 'test2@example.com', subject: 'Second', body: 'Body' };

      await queue.add(email1, 5);
      await queue.add(email2, 5);

      const first = await queue.next();
      const second = await queue.next();

      expect(first).toEqual(email1);
      expect(second).toEqual(email2);
    });

    test('should get items by priority', async () => {
      await queue.add({ to: 'test1@example.com', subject: 'Test', body: 'Body' }, 1);
      await queue.add({ to: 'test2@example.com', subject: 'Test', body: 'Body' }, 2);
      await queue.add({ to: 'test3@example.com', subject: 'Test', body: 'Body' }, 1);

      const priority1Items = queue.getByPriority(1);
      const priority2Items = queue.getByPriority(2);

      expect(priority1Items).toHaveLength(2);
      expect(priority2Items).toHaveLength(1);
    });

    test('should reorder by priority', async () => {
      // Add items in random order
      await queue.add({ to: 'test3@example.com', subject: 'Test', body: 'Body' }, 3);
      await queue.add({ to: 'test1@example.com', subject: 'Test', body: 'Body' }, 1);
      await queue.add({ to: 'test2@example.com', subject: 'Test', body: 'Body' }, 2);

      queue.reorderByPriority();

      const first = await queue.next();
      const second = await queue.next();
      const third = await queue.next();

      expect(first.to).toBe('test1@example.com');
      expect(second.to).toBe('test2@example.com');
      expect(third.to).toBe('test3@example.com');
    });
  });

  describe('Queue management', () => {
    test('should clear all items', async () => {
      await queue.add({ to: 'test1@example.com', subject: 'Test', body: 'Body' });
      await queue.add({ to: 'test2@example.com', subject: 'Test', body: 'Body' });

      expect(queue.size()).toBe(2);

      queue.clear();

      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
    });

    test('should remove specific items by ID', async () => {
      const id1 = await queue.add({ to: 'test1@example.com', subject: 'Test', body: 'Body' });
      const id2 = await queue.add({ to: 'test2@example.com', subject: 'Test', body: 'Body' });

      expect(queue.size()).toBe(2);

      const removed = queue.remove(id1);
      expect(removed).toBe(true);
      expect(queue.size()).toBe(1);

      const remaining = await queue.next();
      expect(remaining.to).toBe('test2@example.com');
    });

    test('should return false when removing non-existent ID', () => {
      const removed = queue.remove('non-existent-id');
      expect(removed).toBe(false);
    });

    test('should get all items for inspection', async () => {
      const email1 = { to: 'test1@example.com', subject: 'Test', body: 'Body' };
      const email2 = { to: 'test2@example.com', subject: 'Test', body: 'Body' };

      await queue.add(email1, 1);
      await queue.add(email2, 2);

      const allItems = queue.getAll();

      expect(allItems).toHaveLength(2);
      expect(allItems[0].emailData).toEqual(email1);
      expect(allItems[0].priority).toBe(1);
      expect(allItems[0].id).toBeDefined();
      expect(allItems[0].timestamp).toBeDefined();
      expect(allItems[0].age).toBeDefined();
    });
  });

  describe('Statistics', () => {
    test('should provide empty queue statistics', () => {
      const stats = queue.getStats();

      expect(stats.size).toBe(0);
      expect(stats.isEmpty).toBe(true);
      expect(stats.oldestItem).toBeNull();
      expect(stats.newestItem).toBeNull();
      expect(stats.averageAge).toBe(0);
      expect(stats.priorityDistribution).toEqual({});
    });

    test('should provide accurate statistics for populated queue', async () => {
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure time difference

      await queue.add({ to: 'test1@example.com', subject: 'Test', body: 'Body' }, 1);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await queue.add({ to: 'test2@example.com', subject: 'Test', body: 'Body' }, 1);
      await queue.add({ to: 'test3@example.com', subject: 'Test', body: 'Body' }, 2);

      const stats = queue.getStats();

      expect(stats.size).toBe(3);
      expect(stats.isEmpty).toBe(false);
      expect(stats.oldestItem).toBeDefined();
      expect(stats.newestItem).toBeDefined();
      expect(stats.averageAge).toBeGreaterThan(0);
      expect(stats.priorityDistribution).toEqual({ '1': 2, '2': 1 });
    });
  });

  describe('Batch processing', () => {
    test('should process items in batches', async () => {
      const results = [];
      const processor = jest.fn().mockImplementation(async (emailData) => {
        results.push(emailData.to);
        return { success: true, email: emailData.to };
      });

      // Add test emails
      for (let i = 1; i <= 10; i++) {
        await queue.add({ to: `test${i}@example.com`, subject: 'Test', body: 'Body' });
      }

      const batchResults = await queue.processBatch(processor, 3);

      expect(processor).toHaveBeenCalledTimes(10);
      expect(batchResults).toHaveLength(10);
      expect(queue.isEmpty()).toBe(true);
      expect(results).toHaveLength(10);
    });

    test('should handle batch processing errors', async () => {
      const processor = jest.fn().mockImplementation(async (emailData) => {
        if (emailData.to.includes('error')) {
          throw new Error('Processing failed');
        }
        return { success: true };
      });

      await queue.add({ to: 'success@example.com', subject: 'Test', body: 'Body' });
      await queue.add({ to: 'error@example.com', subject: 'Test', body: 'Body' });

      const results = await queue.processBatch(processor, 5);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ success: true });
      expect(results[1].error).toBeDefined();
      expect(results[1].emailData.to).toBe('error@example.com');
    });

    test('should prevent concurrent batch processing', async () => {
      const processor = jest.fn().mockResolvedValue({ success: true });

      await queue.add({ to: 'test@example.com', subject: 'Test', body: 'Body' });

      // Start first batch processing
      const promise1 = queue.processBatch(processor, 1);

      // Try to start second batch processing
      await expect(queue.processBatch(processor, 1)).rejects.toThrow('already being processed');

      // Wait for first to complete
      await promise1;

      // Should be able to process again
      await queue.add({ to: 'test2@example.com', subject: 'Test', body: 'Body' });
      await expect(queue.processBatch(processor, 1)).resolves.toBeDefined();
    });

    test('should indicate processing status', async () => {
      expect(queue.isProcessing()).toBe(false);

      const processor = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { success: true };
      });

      await queue.add({ to: 'test@example.com', subject: 'Test', body: 'Body' });

      const processingPromise = queue.processBatch(processor, 1);
      
      expect(queue.isProcessing()).toBe(true);

      await processingPromise;

      expect(queue.isProcessing()).toBe(false);
    });
  });

  describe('ID generation', () => {
    test('should generate unique IDs', async () => {
      const ids = [];
      for (let i = 0; i < 100; i++) {
        const id = await queue.add({ to: 'test@example.com', subject: 'Test', body: 'Body' });
        ids.push(id);
      }

      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100); // All IDs should be unique
    });
  });
});