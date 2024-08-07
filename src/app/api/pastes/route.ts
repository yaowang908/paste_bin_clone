import { NextRequest, NextResponse } from 'next/server';
import db from '../../../db';

export async function POST(req: NextRequest) {
  const { id, content, expirationDate, token } = await req.json();

  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      'INSERT INTO pastes (id, content, expirationDate, token) VALUES (?, ?, ?, ?)'
    );
    stmt.run(id, content, expirationDate, token, (err: Error | null) => {
      if (err) {
        resolve(
          new NextResponse(JSON.stringify({ error: 'Database error' }), {
            status: 500,
          })
        );
        return;
      }
      resolve(
        new NextResponse(
          JSON.stringify({
            id,
            content,
            expirationDate,
            token,
            message: 'Paste created successfully',
          }),
          { status: 200 }
        )
      );
    });
  });
}
