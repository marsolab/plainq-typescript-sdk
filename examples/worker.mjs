import { Client } from '@marsolab/plainq-sdk';

const queueId = process.env.PLAINQ_QUEUE_ID;
if (!queueId) throw new Error('PLAINQ_QUEUE_ID is required');
const client = new Client(process.env.PLAINQ_ADDR ?? 'localhost:8080');
const controller = new AbortController();
process.once('SIGINT', () => controller.abort());
process.once('SIGTERM', () => controller.abort());
try {
  while (!controller.signal.aborted) {
    const { messages } = await client.receive({ queueId, batchSize: 10, waitTimeSeconds: 20 }, { signal: controller.signal });
    for (const message of messages) {
      console.log(message.id, message.body.toString()); // replace with successful processing
      const result = await client.delete({ queueId, messageIds: [message.id] });
      if (result.failed.length) throw new Error(JSON.stringify(result.failed));
    }
  }
} catch (error) {
  if (!controller.signal.aborted) throw error;
} finally {
  client.close();
}
