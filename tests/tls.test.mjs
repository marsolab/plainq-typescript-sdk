import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { Server, ServerCredentials } from '@grpc/grpc-js';
import { Client, credentials, PlainQServiceService, ListQueuesResponse } from '../dist/index.js';

test('TLS credentials verify a local broker certificate', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'plainq-tls-'));
  const server = new Server();
  let client;
  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost', '-keyout', join(dir, 'key.pem'), '-out', join(dir, 'cert.pem')], {stdio: 'ignore'});
    const cert = readFileSync(join(dir, 'cert.pem'));
    server.addService(PlainQServiceService, {listQueues: (_call, done) => done(null, ListQueuesResponse.fromPartial({totalCount: 42n}))});
    const port = await new Promise((resolve, reject) => server.bindAsync('127.0.0.1:0', ServerCredentials.createSsl(null, [{private_key: readFileSync(join(dir, 'key.pem')), cert_chain: cert}]), (err, port) => err ? reject(err) : resolve(port)));
    client = new Client(`localhost:${port}`, {credentials: credentials.createSsl(cert)});
    assert.equal((await client.listQueues({})).totalCount, 42n);
  } finally {
    client?.close(); server.forceShutdown(); rmSync(dir, {recursive: true, force: true});
  }
});
