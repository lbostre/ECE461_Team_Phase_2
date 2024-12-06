// Test streamToBuffer function

import { describe, it, expect } from 'vitest';
import { Readable } from 'stream';
import { streamToBuffer } from '../../../src/util/packageUtils';

describe('streamToBuffer', () => {
  it('should convert a stream to a buffer', async () => {
    const content = 'example content';
    const stream = Readable.from([Buffer.from(content)]);

    const result = await streamToBuffer(stream);

    expect(result).toEqual(Buffer.from(content));
  });

  it('should handle an empty stream', async () => {
    const stream = Readable.from([]);

    const result = await streamToBuffer(stream);

    expect(result).toEqual(Buffer.from([]));
  });

  it('should throw an error if the stream is null', async () => {
    await expect(streamToBuffer(null)).rejects.toThrow('Stream is null or undefined');
  });

  it('should handle a stream with multiple chunks', async () => {
    const chunks = ['chunk1', 'chunk2', 'chunk3'];
    const stream = Readable.from(chunks.map(chunk => Buffer.from(chunk)));

    const result = await streamToBuffer(stream);

    expect(result).toEqual(Buffer.concat(chunks.map(chunk => Buffer.from(chunk))));
  });
});