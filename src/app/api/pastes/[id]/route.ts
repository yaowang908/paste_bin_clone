import { NextRequest, NextResponse } from 'next/server';
import { useRouter } from 'next/router';
import db from '../../../../db';
import { Paste } from '@/app/page';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.nextUrl.searchParams.get('token');

  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM pastes WHERE id = ?',
      [params.id],
      (err: Error | undefined, row: Paste) => {
        if (err) {
          resolve(
            new NextResponse(JSON.stringify({ error: 'Database error' }), {
              status: 500,
            })
          );
          return;
        }
        if (!row) {
          resolve(
            new NextResponse(JSON.stringify({ error: 'Paste not found' }), {
              status: 404,
            })
          );
          return;
        }
        resolve(new NextResponse(JSON.stringify(row), { status: 200 }));
      }
    );
  });
}

export async function PUT(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const { content, expirationDate, token } = await req.json();

  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE pastes SET content = ?, expirationDate = ?, token = ? WHERE id = ?',
      [content, expirationDate, token, id],
      function (err: Error | undefined) {
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
            JSON.stringify({ message: 'Paste updated successfully' }),
            { status: 200 }
          )
        );
      }
    );
  });
}
