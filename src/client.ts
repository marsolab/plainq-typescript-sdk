import {
  credentials, Metadata, status,
  type ChannelCredentials, type ChannelOptions, type CallOptions,
  type ClientUnaryCall, type ServiceError,
} from "@grpc/grpc-js";
import * as v1 from "./generated/v1/schema.js";

export interface ClientOptions {
  /** Plaintext by default, matching the Go SDK. Use createSsl() for TLS. */
  credentials?: ChannelCredentials;
  channelOptions?: ChannelOptions;
  userAgent?: string;
}

export interface RequestOptions {
  metadata?: Metadata;
  /** Defaults to a 30-second deadline; set deadline explicitly to override. */
  callOptions?: Partial<CallOptions>;
  signal?: AbortSignal;
}

/** Native gRPC client for Node.js. Close it when it is no longer needed. */
export class Client {
  readonly serviceClient: v1.PlainQServiceClient;

  constructor(address: string, options: ClientOptions = {}) {
    if (!address.trim()) throw new TypeError("plainq: address is required");
    this.serviceClient = new v1.PlainQServiceClient(
      address, options.credentials ?? credentials.createInsecure(),
      { ...options.channelOptions, ...(options.userAgent ? { "grpc.primary_user_agent": options.userAgent } : {}) },
    );
  }

  close(): void { this.serviceClient.close(); }

  private call<T>(
    invoke: (metadata: Metadata, options: Partial<CallOptions>, callback: (error: ServiceError | null, response?: T) => void) => ClientUnaryCall,
    options: RequestOptions,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const { signal } = options;
      if (signal?.aborted) {
        reject(Object.assign(new Error("plainq: call cancelled"), { code: status.CANCELLED }));
        return;
      }
      const call = invoke(options.metadata ?? new Metadata(),
        { deadline: Date.now() + 30_000, ...options.callOptions }, (error, response) => {
          signal?.removeEventListener("abort", abort);
          if (error) reject(error);
          else if (response !== undefined) resolve(response);
          else reject(new Error("plainq: RPC returned no response"));
        });
      const abort = () => call.cancel();
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) abort();
    });
  }

  listQueues(request: v1.DeepPartial<v1.ListQueuesRequest>, options: RequestOptions = {}): Promise<v1.ListQueuesResponse> {
    return this.call((metadata, callOptions, callback) =>
      this.serviceClient.listQueues(v1.ListQueuesRequest.fromPartial(request), metadata, callOptions, callback), options);
  }

  describeQueue(request: v1.DeepPartial<v1.DescribeQueueRequest>, options: RequestOptions = {}): Promise<v1.DescribeQueueResponse> {
    return this.call((metadata, callOptions, callback) =>
      this.serviceClient.describeQueue(v1.DescribeQueueRequest.fromPartial(request), metadata, callOptions, callback), options);
  }

  createQueue(request: v1.DeepPartial<v1.CreateQueueRequest>, options: RequestOptions = {}): Promise<v1.CreateQueueResponse> {
    return this.call((metadata, callOptions, callback) =>
      this.serviceClient.createQueue(v1.CreateQueueRequest.fromPartial(request), metadata, callOptions, callback), options);
  }

  purgeQueue(request: v1.DeepPartial<v1.PurgeQueueRequest>, options: RequestOptions = {}): Promise<v1.PurgeQueueResponse> {
    return this.call((metadata, callOptions, callback) =>
      this.serviceClient.purgeQueue(v1.PurgeQueueRequest.fromPartial(request), metadata, callOptions, callback), options);
  }

  deleteQueue(request: v1.DeepPartial<v1.DeleteQueueRequest>, options: RequestOptions = {}): Promise<v1.DeleteQueueResponse> {
    return this.call((metadata, callOptions, callback) =>
      this.serviceClient.deleteQueue(v1.DeleteQueueRequest.fromPartial(request), metadata, callOptions, callback), options);
  }

  send(request: v1.DeepPartial<v1.SendRequest>, options: RequestOptions = {}): Promise<v1.SendResponse> {
    return this.call((metadata, callOptions, callback) =>
      this.serviceClient.send(v1.SendRequest.fromPartial(request), metadata, callOptions, callback), options);
  }

  receive(request: v1.DeepPartial<v1.ReceiveRequest>, options: RequestOptions = {}): Promise<v1.ReceiveResponse> {
    return this.call((metadata, callOptions, callback) =>
      this.serviceClient.receive(v1.ReceiveRequest.fromPartial(request), metadata, callOptions, callback), options);
  }

  delete(request: v1.DeepPartial<v1.DeleteRequest>, options: RequestOptions = {}): Promise<v1.DeleteResponse> {
    return this.call((metadata, callOptions, callback) =>
      this.serviceClient.delete(v1.DeleteRequest.fromPartial(request), metadata, callOptions, callback), options);
  }

  listTopics(request: v1.DeepPartial<v1.ListTopicsRequest>, options: RequestOptions = {}): Promise<v1.ListTopicsResponse> {
    return this.call((metadata, callOptions, callback) =>
      this.serviceClient.listTopics(v1.ListTopicsRequest.fromPartial(request), metadata, callOptions, callback), options);
  }

  createTopic(request: v1.DeepPartial<v1.CreateTopicRequest>, options: RequestOptions = {}): Promise<v1.CreateTopicResponse> {
    return this.call((metadata, callOptions, callback) =>
      this.serviceClient.createTopic(v1.CreateTopicRequest.fromPartial(request), metadata, callOptions, callback), options);
  }

  deleteTopic(request: v1.DeepPartial<v1.DeleteTopicRequest>, options: RequestOptions = {}): Promise<v1.DeleteTopicResponse> {
    return this.call((metadata, callOptions, callback) =>
      this.serviceClient.deleteTopic(v1.DeleteTopicRequest.fromPartial(request), metadata, callOptions, callback), options);
  }

  subscribe(request: v1.DeepPartial<v1.SubscribeRequest>, options: RequestOptions = {}): Promise<v1.SubscribeResponse> {
    return this.call((metadata, callOptions, callback) =>
      this.serviceClient.subscribe(v1.SubscribeRequest.fromPartial(request), metadata, callOptions, callback), options);
  }

  unsubscribe(request: v1.DeepPartial<v1.UnsubscribeRequest>, options: RequestOptions = {}): Promise<v1.UnsubscribeResponse> {
    return this.call((metadata, callOptions, callback) =>
      this.serviceClient.unsubscribe(v1.UnsubscribeRequest.fromPartial(request), metadata, callOptions, callback), options);
  }

  publish(request: v1.DeepPartial<v1.PublishRequest>, options: RequestOptions = {}): Promise<v1.PublishResponse> {
    return this.call((metadata, callOptions, callback) =>
      this.serviceClient.publish(v1.PublishRequest.fromPartial(request), metadata, callOptions, callback), options);
  }
}
