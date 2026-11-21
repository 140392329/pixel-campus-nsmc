export interface SseEvent {
  data: string;
  done: boolean;
}

export function parseSseChunk(buffer: string): { events: SseEvent[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const parts = normalized.split('\n\n');
  const rest = parts.pop() ?? '';
  const events: SseEvent[] = [];
  for (const block of parts) {
    const dataLines = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''));
    if (dataLines.length === 0) continue;
    const data = dataLines.join('\n');
    events.push({ data, done: data.trim() === '[DONE]' });
  }
  return { events, rest };
}
