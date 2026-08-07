import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

export interface Message {
  id: number;
  nickname: string;
  message: string;
  created_at: string; // ISO 8601
}

// -------------------- 客户端限流 --------------------
const SESSION_KEY = 'gb-last-post';
const MIN_INTERVAL_MS = 60_000; // 60 秒一次

function canPost(): boolean {
  const last = sessionStorage.getItem(SESSION_KEY);
  if (!last) return true;
  return Date.now() - parseInt(last, 10) >= MIN_INTERVAL_MS;
}

function secondsUntilNextPost(): number {
  const last = sessionStorage.getItem(SESSION_KEY);
  if (!last) return 0;
  const remain = MIN_INTERVAL_MS - (Date.now() - parseInt(last, 10));
  return Math.max(0, Math.ceil(remain / 1000));
}

function markPosted() {
  sessionStorage.setItem(SESSION_KEY, String(Date.now()));
}

// -------------------- 输入校验 --------------------
export function validateNickname(n: string): string | null {
  const t = n.trim();
  if (t.length === 0) return '昵称不能为空';
  if (t.length > 20) return '昵称最多 20 个字';
  return null;
}

export function validateMessage(m: string): string | null {
  const t = m.trim();
  if (t.length === 0) return '留言不能为空';
  if (t.length > 500) return '留言最多 500 个字';
  return null;
}

// -------------------- API 调用 --------------------
const HEADERS: Record<string, string> = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

export async function fetchMessages(limit = 50): Promise<Message[]> {
  const url =
    `${SUPABASE_URL}/rest/v1/guestbook` +
    `?select=id,nickname,message,created_at` +
    `&is_deleted=eq.false` +
    `&order=created_at.desc` +
    `&limit=${limit}`;

  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.error('留言簿读取失败:', res.status);
      return [];
    }
    return (await res.json()) as Message[];
  } catch {
    console.error('留言簿网络错误');
    return [];
  }
}

export async function postMessage(
  nickname: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!canPost()) {
    return { ok: false, error: `请 ${secondsUntilNextPost()} 秒后再留言` };
  }

  const nickErr = validateNickname(nickname);
  if (nickErr) return { ok: false, error: nickErr };

  const msgErr = validateMessage(message);
  if (msgErr) return { ok: false, error: msgErr };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/guestbook`, {
      method: 'POST',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        nickname: nickname.trim(),
        message: message.trim(),
      }),
    });

    if (!res.ok) {
      console.error('留言提交失败:', res.status);
      return { ok: false, error: '留言失败，请稍后重试' };
    }

    markPosted();
    return { ok: true };
  } catch {
    return { ok: false, error: '网络错误，请检查网络后重试' };
  }
}
