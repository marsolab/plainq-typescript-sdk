# PlainQ TypeScript SDK

A typed Node.js client for [PlainQ](https://github.com/marsolab/plainq), with the
same 14 native gRPC operations as the [Go SDK](https://github.com/marsolab/plainq-go-sdk).
Supports TypeScript and JavaScript, ESM and CommonJS. Requires Node.js 22+.
This connects to the broker's **gRPC address**, not a PlainQ Cloud HTTP endpoint.

## Install

```sh
npm install @marsolab/plainq-sdk
```

Until the first npm publication, install the `.tgz` from this repository's GitHub release:

```sh
npm install ./marsolab-plainq-sdk-0.1.0.tgz
```

## Quick start

```ts
import { Client } from '@marsolab/plainq-sdk';

const client = new Client('localhost:8080');
try {
  const { queueId } = await client.createQueue({ queueName: 'orders' });
  await client.send({ queueId, messages: [{ body: Buffer.from('{"order":123}') }] });
  const { messages } = await client.receive({ queueId, batchSize: 10, waitTimeSeconds: 20 });
  for (const message of messages) {
    console.log(message.id, message.body.toString());
    // Acknowledge only after processing succeeds.
    const result = await client.delete({ queueId, messageIds: [message.id] });
    if (result.failed.length) throw new Error(JSON.stringify(result.failed));
  }
} finally {
  client.close();
}
```

## API

Each method accepts a typed request object and optional `RequestOptions`, and
returns a `Promise` of the generated response. Omitted request fields use protobuf
defaults; the server owns validation. Empty requests are `{}`.

| Group | Methods |
| --- | --- |
| Queues | `listQueues`, `describeQueue`, `createQueue`, `purgeQueue`, `deleteQueue` |
| Messages | `send`, `receive`, `delete` |
| Topics | `listTopics`, `createTopic`, `deleteTopic`, `subscribe`, `unsubscribe`, `publish` |

All generated message interfaces, codecs, enum values, and `PlainQServiceClient`
are exported. `client.serviceClient` exposes the callback client and underlying
channel. `Buffer` carries bytes; **all int64/uint64 fields use bigint** to avoid
precision loss. Timestamps retain `{ seconds: bigint, nanos: number }`.
Use generated `toJSON()` codecs when serializing messages containing bigint.
Queue listing preserves `nextCursor` and `hasMore`; pass the cursor to the next call.

```ts
const { topicId } = await client.createTopic({ topicName: 'events' });
await client.subscribe({ topicId, queueId });
const result = await client.publish({ topicId, messages: [{ body: Buffer.from('hello') }] });
console.log(result.deliveredCount); // bigint; fan-out deliveries, not source message count
```

## Transport, authentication, deadlines, cancellation

Plaintext is the default, matching the Go SDK. Use TLS for encrypted connections.
Caller-provided gRPC metadata supports the broker's authentication configuration.

```ts
import { Client, credentials, Metadata } from '@marsolab/plainq-sdk';
const client = new Client('broker.example:443', {
  credentials: credentials.createSsl(),
  userAgent: 'orders-worker/1.0',
});
const metadata = new Metadata();
metadata.set('authorization', `Bearer ${process.env.PLAINQ_TOKEN}`);
const controller = new AbortController();
await client.receive({ queueId, waitTimeSeconds: 20 }, {
  metadata,
  signal: controller.signal,
  callOptions: { deadline: Date.now() + 25_000 },
});
```

Calls default to a 30-second deadline, which accommodates the server's maximum
20-second long poll. An explicit deadline overrides it (`Infinity` disables it).
Errors retain native gRPC `code`, `details`, and `metadata`. AbortSignal cancellation
uses `status.CANCELLED`. The SDK adds no application retries: retrying writes after
an ambiguous transport failure can duplicate messages. Native gRPC channel options
can be supplied through `channelOptions`. This package targets Node.js, not browsers.

## Development

```sh
npm ci
npm run generate       # pinned Buf and ts-proto; vendored schema, no remote schema lookup
npm run typecheck
npm test               # local gRPC transport tests
PLAINQ_ADDR=127.0.0.1:18080 npm run test:integration
npm pack               # builds the distributable package
```

The integration command requires a **disposable broker** and fails if its address
is missing. It creates and removes its own queue and topic. See [SCHEMA.md](SCHEMA.md)
for the upstream pin and [PUBLISHING.md](PUBLISHING.md) for releases.
Run [examples/worker.mjs](examples/worker.mjs) with `PLAINQ_ADDR` and `PLAINQ_QUEUE_ID`.

## License

[MIT](LICENSE).
