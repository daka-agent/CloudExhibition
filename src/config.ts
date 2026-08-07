export interface Exhibit {
  id: string;
  title: string;
  author: string;
  cover: string;
  summary: string;
  content?: string;
  link?: string;
}

export async function loadExhibits(): Promise<Exhibit[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}content/exhibits.json`);
  if (!res.ok) {
    throw new Error(`加载展品数据失败：HTTP ${res.status}`);
  }
  return (await res.json()) as Exhibit[];
}
