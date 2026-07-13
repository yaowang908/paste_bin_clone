import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
// @ts-ignore
import db from './src/db/index.js'

const app = new Hono()

// API Routes
app.get('/api/pastes/:id', (c) => {
    const id = c.req.param('id')

    try {
        const row = db.query('SELECT * FROM pastes WHERE id = ?').get(id);
        if (!row) {
            return c.json({ error: 'Paste not found' }, 404);
        }
        return c.json(row);
    } catch (err) {
        return c.json({ error: 'Database error' }, 500);
    }
})

app.post('/api/pastes', async (c) => {
    const { id, content, expirationDate, token } = await c.req.json()

    try {
        db.query('INSERT INTO pastes (id, content, expirationDate, token) VALUES (?, ?, ?, ?)').run(id, content, expirationDate, token);
        return c.json({ id, content, expirationDate, token, message: 'Paste created successfully' });
    } catch (err) {
        console.error(err);
        return c.json({ error: 'Database error' }, 500);
    }
})

app.put('/api/pastes/:id', async (c) => {
    const id = c.req.param('id')
    const { content, expirationDate, token } = await c.req.json()

    try {
        db.query('UPDATE pastes SET content = ?, expirationDate = ?, token = ? WHERE id = ?').run(content, expirationDate, token, id);
        return c.json({ message: 'Paste updated successfully' });
    } catch (err) {
        return c.json({ error: 'Database error' }, 500);
    }
})


// Serve static files in production
app.use('/*', serveStatic({ root: './dist' }))
// Fallback for SPA routing
app.get('*', serveStatic({ path: './dist/index.html' }))

const port = Number(process.env.PORT) || 3000
console.log(`Server is running on port ${port}`)

export default {
    port,
    fetch: app.fetch,
}
