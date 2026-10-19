import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Server, ServerCredentials, status, Metadata } from '@grpc/grpc-js';
import { Client, PlainQServiceService, ListQueuesResponse, DescribeQueueResponse } from '../dist/index.js';

let server, client;
before(async () => {
  server = new Server();
  const handlers = {};
  for (const method of Object.keys(PlainQServiceService)) {
    handlers[method] = (call, done) => {
      if (call.metadata.get('fail').length) return done({code: status.PERMISSION_DENIED, details: 'denied'});
      if (call.metadata.get('delay').length) return; // transport must cancel or enforce deadline
      if (method === 'send') return done(null, {messageIds: [call.request.messages[0].body.toString('hex')]});
      if (method === 'listQueues') return done(null, ListQueuesResponse.fromPartial({totalCount: 9007199254740993n}));
      if (method === 'describeQueue') return done(null, DescribeQueueResponse.fromPartial({
        queueName: call.metadata.get('authorization')[0] ?? '',
        retentionPeriodSeconds: 18446744073709551615n,
        createdAt: {seconds: 1234567890n, nanos: 123456789},
      }));
      done(null, PlainQServiceService[method].responseDeserialize(Buffer.alloc(0)));
    };
  }
  server.addService(PlainQServiceService, handlers);
  const port = await new Promise((resolve, reject) => server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, port) => err ? reject(err) : resolve(port)));
  client = new Client(`127.0.0.1:${port}`);
});
after(() => { client.close(); server.forceShutdown(); });

test('every service RPC is callable over the wire', async () => {
  for (const method of Object.keys(PlainQServiceService)) {
    await client[method](method === 'send' ? {messages: [{body: Buffer.from([0, 255, 128])}]} : {});
  }
});
test('binary payloads and 64-bit integers are lossless', async () => {
  assert.deepEqual((await client.send({messages: [{body: Buffer.from([0, 255, 128])}]})).messageIds, ['00ff80']);
  assert.equal((await client.listQueues({})).totalCount, 9007199254740993n);
  const queue = await client.describeQueue({});
  assert.equal(queue.retentionPeriodSeconds, 18446744073709551615n);
  assert.equal(queue.createdAt.nanos, 123456789);
});
test('metadata and gRPC status survive the wrapper', async () => {
  const metadata = new Metadata(); metadata.set('authorization', 'Bearer test-token');
  assert.equal((await client.describeQueue({}, {metadata})).queueName, 'Bearer test-token');
  metadata.set('fail', 'yes');
  await assert.rejects(client.listQueues({}, {metadata}), {code: status.PERMISSION_DENIED});
});
test('deadline and AbortSignal cancel pending calls', async () => {
  const metadata = new Metadata(); metadata.set('delay', 'yes');
  await assert.rejects(client.receive({}, {metadata, callOptions: {deadline: Date.now() + 50}}), {code: status.DEADLINE_EXCEEDED});
  const controller = new AbortController();
  const call = client.receive({}, {metadata, signal: controller.signal});
  controller.abort();
  await assert.rejects(call, {code: status.CANCELLED});
  await assert.rejects(client.receive({}, {signal: controller.signal}), {code: status.CANCELLED});
});
test('CommonJS entry point and address validation', () => {
  const { Client: CjsClient } = createRequire(import.meta.url)('../dist/index.cjs');
  assert.throws(() => new CjsClient(' '), /address is required/);
  const c = new CjsClient('127.0.0.1:1'); c.close(); c.close();
});
