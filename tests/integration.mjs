import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client } from '../dist/index.js';

test('all 14 RPCs against a disposable PlainQ broker', async () => {
  assert.ok(process.env.PLAINQ_ADDR, 'PLAINQ_ADDR must identify a disposable broker');
  const client = new Client(process.env.PLAINQ_ADDR);
  let queueId, topicId, subscriptionId;
  const name = `ts-${randomUUID()}`;
  try {
    ({queueId} = await client.createQueue({queueName: name}));
    assert.ok(queueId);
    assert.equal((await client.describeQueue({queueId})).queueName, name);
    assert.equal((await client.listQueues({queuePrefix: name})).queues[0].queueId, queueId);
    const payload = Buffer.from([0, 1, 128, 255]);
    const sent = await client.send({queueId, messages: [{body: payload}]});
    const received = await client.receive({queueId, batchSize: 10, waitTimeSeconds: 1});
    assert.deepEqual(received.messages.map(m => m.id), sent.messageIds);
    assert.deepEqual(received.messages[0].body, payload);
    const deleted = await client.delete({queueId, messageIds: sent.messageIds});
    assert.deepEqual(deleted.successful, sent.messageIds); assert.equal(deleted.failed.length, 0);
    ({topicId} = await client.createTopic({topicName: name}));
    ({subscriptionId} = await client.subscribe({topicId, queueId}));
    assert.ok((await client.listTopics({})).topics.some(t => t.topicId === topicId));
    const published = await client.publish({topicId, messages: [{body: payload}]});
    assert.equal(published.deliveredCount, 1n); assert.deepEqual(published.queueIds, [queueId]);
    const fanout = await client.receive({queueId});
    assert.deepEqual(fanout.messages[0].body, payload);
    await client.unsubscribe({topicId, subscriptionId}); subscriptionId = undefined;
    await client.send({queueId, messages: [{body: payload}]});
    assert.ok((await client.purgeQueue({queueId})).messagesCount >= 1n);
    assert.equal((await client.receive({queueId})).messages.length, 0);
  } finally {
    try { if (topicId) await client.deleteTopic({topicId}); }
    finally { try { if (queueId) await client.deleteQueue({queueId, force: true}); } finally { client.close(); } }
  }
});
