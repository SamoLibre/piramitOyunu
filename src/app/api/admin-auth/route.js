import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const provided = (body.secret || '').trim();
    const expected = (process.env.ANALYTICS_SECRET || '').trim();

    if (!expected) {
      return NextResponse.json({ error: 'Sunucuda ANALYTICS_SECRET tanımlı değil.' }, { status: 500 });
    }

    if (provided === expected) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Yanlış şifre.' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }
}
