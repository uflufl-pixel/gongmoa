import { listNotices, listSources } from '@/db/queries';

export async function GET() {
  try {
    const [items, sourceItems] = await Promise.all([listNotices(), listSources()]);
    return Response.json({ items, sources: sourceItems, generatedAt: new Date().toISOString(), mode: 'live-db' });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Database unavailable' }, { status: 503 });
  }
}
