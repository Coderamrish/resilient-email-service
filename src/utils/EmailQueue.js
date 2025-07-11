export default class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async add(emailData, priority = 0) {
    const queueItem = {
      emailData: { ...emailData },
      priority,
      timestamp: Date.now(),
      id: this.generateId(),
    };

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

  async next() {
    if (this.queue.length === 0) {
      return null;
    }

    const item = this.queue.shift();
    return item.emailData;
  }

  peek() {
    if (this.queue.length === 0) {
      return null;
    }

    return { ...this.queue[0].emailData };
  }

  size() {
    return this.queue.length;
  }

  isEmpty() {
    return this.queue.length === 0;
  }

  clear() {
    this.queue = [];
    this.processing = false;
  }

  remove(id) {
    const index = this.queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  getAll() {
    return this.queue.map((item) => ({
      id: item.id,
      emailData: { ...item.emailData },
      priority: item.priority,
      timestamp: item.timestamp,
      age: Date.now() - item.timestamp,
    }));
  }

  getStats() {
    if (this.queue.length === 0) {
      return {
        size: 0,
        isEmpty: true,
        oldestItem: null,
        newestItem: null,
        averageAge: 0,
        priorityDistribution: {},
      };
    }

    const now = Date.now();
    const ages = this.queue.map((item) => now - item.timestamp);
    const priorities = this.queue.map((item) => item.priority);

    const priorityDistribution = {};
    priorities.forEach((priority) => {
      priorityDistribution[priority] =
        (priorityDistribution[priority] || 0) + 1;
    });

    return {
      size: this.queue.length,
      isEmpty: false,
      oldestItem: {
        age: Math.max(...ages),
        timestamp: Math.min(...this.queue.map((item) => item.timestamp)),
      },
      newestItem: {
        age: Math.min(...ages),
        timestamp: Math.max(...this.queue.map((item) => item.timestamp)),
      },
      averageAge: Math.round(
        ages.reduce((sum, age) => sum + age, 0) / ages.length
      ),
      priorityDistribution,
    };
  }

  async processBatch(processor, batchSize = 5) {
    if (this.processing) {
      throw new Error("Queue is already being processed");
    }

    this.processing = true;
    const results = [];

    try {
      while (!this.isEmpty()) {
        const batch = [];

        for (let i = 0; i < batchSize && !this.isEmpty(); i++) {
          const emailData = await this.next();
          if (emailData) {
            batch.push(emailData);
          }
        }

        if (batch.length === 0) break;

        const batchPromises = batch.map((emailData) =>
          Promise.resolve(processor(emailData)).catch((error) => ({
            error,
            emailData,
          }))
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
    } finally {
      this.processing = false;
    }

    return results;
  }

  isProcessing() {
    return this.processing;
  }

  generateId() {
    return `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getByPriority(priority) {
    return this.queue
      .filter((item) => item.priority === priority)
      .map((item) => ({
        id: item.id,
        emailData: { ...item.emailData },
        timestamp: item.timestamp,
        age: Date.now() - item.timestamp,
      }));
  }

  reorderByPriority() {
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.timestamp - b.timestamp;
    });
  }
}