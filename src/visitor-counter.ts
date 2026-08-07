/**
 * 访客计数器 —— 基于 Abacus 免费 API
 * API 文档: https://abacus.jasoncameron.dev
 * 无需注册，支持 CORS，返回 JSON { "value": N }
 */

const NAMESPACE = 'dakashishouji';
const KEY = 'yunshangzhanting';
const HIT_URL = `https://abacus.jasoncameron.dev/hit/${NAMESPACE}/${KEY}`;
const GET_URL = `https://abacus.jasoncameron.dev/get/${NAMESPACE}/${KEY}`;
const SESSION_FLAG = 'yunshangzhanting-counted';

/**
 * 获取访客数。首次访问本会话时 +1，后续只读取不递增。
 * API 不可用时返回 null，调用方自行降级处理。
 */
export async function fetchVisitorCount(): Promise<number | null> {
  try {
    const alreadyCounted = sessionStorage.getItem(SESSION_FLAG);
    const url = alreadyCounted ? GET_URL : HIT_URL;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as { value?: number };
    if (typeof data.value !== 'number') return null;

    sessionStorage.setItem(SESSION_FLAG, '1');
    return data.value;
  } catch {
    return null;
  }
}
