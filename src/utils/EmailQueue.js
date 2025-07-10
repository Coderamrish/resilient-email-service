/**
 * Email Queue Implementation
 * 
 * Simple in-memory queue for managing email sending tasks
 * with priority support and basic queue operations.
 */

export default class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  /**
   * Add an email to the queue
   * @param {Object} emailData - Email data
   * @param {number} priority - Priority (lower number = higher priority)
   * @returns {Promise<void>}
   */
  async add(emailData, priority = 0) {
    const queueItem = {
      emailData: { ...emailData },
      priority,
      timestamp: Date.now(),
      id: this.generateId()
    };

    // Insert item based on priority (lower number = higher priority)
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority > priority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, queueItem);
    return queueItem.id;
  }

  /**
   * Get the next email from the queue
   * @returns {Object|null} - Next email data or null if queue is empty
   */
  async next() {
    if (this.queue.length === 0) {
      return null;
    }

    const item = this.queue.shift();
    return item.emailData;
  }

  /**
   * Peek at the next email without removing it
   * @returns {Object|null} - Next email data or null if queue is empty
   */
  peek() {
    if (this.queue.length === 0) {
      return null;
    }

    return { ...this.queue[0].emailData };
  }

  /**
   * Get queue size
   * @returns {number} - Number of items in queue
   */
  size() {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   * @returns {boolean} - True if queue is empty
   */
  isEmpty() {
    return this.queue.length === 0;
  }

  /**
   * Clear the entire queue
   */
  clear() {
    this.queue = [];
    this.processing = false;
  }

  /**
   * Remove a specific email from the queue by ID
   * @param {string} id - Queue item ID
   * @returns {boolean} - True if item was removed
   */
  remove(id) {
    const index = this.queue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all queue items (for inspection)
   * @returns {Array} - Array of queue items
   */
  getAll() {
    return this.queue.map(item => ({
      id: item.id,
      emailData: { ...item.emailData },
      priority: item.priority,
      timestamp: item.timestamp,
      age: Date.now() - item.timestamp
    }));
  }

  /**
   * Get queue statistics
   * @returns {Object} - Queue statistics
   */
  getStats() {
    if (this.queue.length === 0) {
      return {
        size: 0,
        isEmpty: true,
        oldestItem: null,
        newestItem: null,
        averageAge: 0,
        priorityDistribution: {}
      };
    }

    const now = Date.now();
    const ages = this.queue.map(item => now - item.timestamp);
    const priorities = this.queue.map(item => item.priority);
    
    const priorityDistribution = {};
    priorities.forEach(priority => {
      priorityDistribution[priority] = (priorityDistribution[priority] || 0) + 1;
    });

    return {
      size: this.queue.length,
      isEmpty: false,
      oldestItem: {
        age: Math.max(...ages),
        timestamp: Math.min(...this.queue.map(item => item.timestamp))
      },
      newestItem: {
        age: Math.min(...ages),
        timestamp: Math.max(...this.queue.map(item => item.timestamp))
      },
      averageAge: Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length),
      priorityDistribution
    };
  }

  /**
   * Process queue items in batches
   * @param {Function} processor - Function to process each item
   * @param {number} batchSize - Number of items to process simultaneously
   * @returns {Promise<Array>} - Results of processing
   */
  async processBatch(processor, batchSize = 5) {
    if (this.processing) {
      throw new Error('Queue is already being processed');
    }

    this.processing = true;
    const results = [];

    try {
      while (!this.isEmpty()) {
        const batch = [];
        
        // Get batch of items
        for (let i = 0; i < batchSize && !this.isEmpty(); i++) {
          const emailData = await this.next();
          if (emailData) {
            batch.push(emailData);
          }
        }

        if (batch.length === 0) break;

        // Process batch in parallel
        const batchPromises = batch.map(emailData => 
          Promise.resolve(processor(emailData)).catch(error => ({ error, emailData }))
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
    } finally {
      this.processing = false;
    }

    return results;
  }

  /**
   * Check if queue is currently being processed
   * @returns {boolean} - True if processing
   */
  isProcessing() {
    return this.processing;
  }

  /**
   * Generate unique ID for queue items
   * @private
   * @returns {string} - Unique ID
   */
  generateId() {
    return `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get items by priority
   * @param {number} priority - Priority level
   * @returns {Array} - Items with specified priority
   */
  getByPriority(priority) {
    return this.queue
      .filter(item => item.priority === priority)
      .map(item => ({
        id: item.id,
        emailData: { ...item.emailData },
        timestamp: item.timestamp,
        age: Date.now() - item.timestamp
      }));
  }

  /**
   * Reorder queue by priority
   */
  reorderByPriority() {
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower number = higher priority
      }
      return a.timestamp - b.timestamp; // FIFO for same priority
    });
  }
}