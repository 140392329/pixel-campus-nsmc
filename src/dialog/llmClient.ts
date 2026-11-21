import type { LlmError, LlmSettings } from '../types';
import { parseSseChunk } from './sse';
import { redact } from './redact';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface StreamHandlers {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (e: LlmError) => void;
}

function statusError(status: number): LlmError {
  if (status === 401 || status === 403) {
    return { kind: 'auth', message: 'API Key 无效或无权限', status };
  }
  if (status === 429) {
    return { kind: 'rate_limit', message: '请求太频繁，60 秒后再试', status };
  }
  if (status >= 500) {
    return { kind: 'server', message: `服务暂时不可用（${status}）`, status };
  }
  return { kind: 'unknown', message: `请求失败（${status}）`, status };
}

export async function streamChat(
  settings: LlmSettings,
  messages: LlmMessage[],
  handlers: StreamHandlers,
  externalSignal?: AbortSignal,
): Promise<void> {
  if (!settings.apiKey.trim()) {
    handlers.onError({ kind: 'no_key', message: '未配置 AI' });
    return;
  }
  const controller = new AbortController();
  let timedOut = false;
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

  let firstByte = false;
  const firstTimer = window.setTimeout(() => {
    if (!firstByte) {
      timedOut = true;
      controller.abort();
    }
  }, 20000);
  const totalTimer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 60000);

  try {
    const url = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages,
        stream: true,
        temperature: 0.8,
        max_tokens: 200,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      handlers.onError(statusError(res.status));
      return;
    }
    if (!res.body) {
      handlers.onError({ kind: 'bad_response', message: '响应为空' });
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let done = false;
    while (!done) {
      const chunk = await reader.read();
      if (chunk.done) break;
      firstByte = true;
      buffer += decoder.decode(chunk.value, { stream: true });
      const parsed = parseSseChunk(buffer);
      buffer = parsed.rest;
      for (const ev of parsed.events) {
        if (ev.done) {
          done = true;
          break;
        }
        try {
          const json = JSON.parse(ev.data);
          const text = json?.choices?.[0]?.delta?.content;
          if (typeof text === 'string' && text.length > 0) handlers.onDelta(text);
          const finish = json?.choices?.[0]?.finish_reason;
          if (finish) done = true;
        } catch {
          // 非 JSON 行忽略
        }
      }
    }
    handlers.onDone();
  } catch (err) {
    const e = err as Error;
    if (e.name === 'AbortError') {
      handlers.onError(
        timedOut
          ? { kind: 'timeout', message: '对方好像走神了' }
          : { kind: 'aborted', message: '已停止' },
      );
      return;
    }
    if (e instanceof TypeError) {
      handlers.onError({
        kind: 'cors',
        message: '网络或跨域被拦截，请检查 Base URL 是否允许浏览器直连',
      });
      return;
    }
    handlers.onError({ kind: 'unknown', message: redact(e.message || '连接失败') });
  } finally {
    window.clearTimeout(firstTimer);
    window.clearTimeout(totalTimer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

export async function testConnection(settings: LlmSettings): Promise<LlmError | null> {
  if (!settings.apiKey.trim()) return { kind: 'no_key', message: '请先填写 API Key' };
  if (!settings.model.trim()) return { kind: 'unknown', message: '请填写模型名称' };
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15000);
  try {
    const url = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 8,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return statusError(res.status);
    return null;
  } catch (err) {
    const e = err as Error;
    if (e.name === 'AbortError') return { kind: 'timeout', message: '连接超时' };
    if (e instanceof TypeError) {
      return { kind: 'cors', message: '网络或跨域被拦截' };
    }
    return { kind: 'unknown', message: redact(e.message || '连接失败') };
  } finally {
    window.clearTimeout(timer);
  }
}
