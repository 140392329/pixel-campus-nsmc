import { describe, expect, it } from 'vitest';
import { parseSseChunk } from '../src/dialog/sse';

describe('parseSseChunk', () => {
  it('parses one complete event and keeps the rest', () => {
    const { events, rest } = parseSseChunk('data: {"a":1}\n\ndata: {"b"');
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('{"a":1}');
    expect(rest).toBe('data: {"b"');
  });

  it('detects DONE', () => {
    const { events } = parseSseChunk('data: [DONE]\n\n');
    expect(events).toEqual([{ data: '[DONE]', done: true }]);
  });

  it('handles CRLF line endings', () => {
    const { events } = parseSseChunk('data: hello\r\n\r\n');
    expect(events[0].data).toBe('hello');
  });
});
