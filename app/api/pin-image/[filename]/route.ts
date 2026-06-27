import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { getPinsDir } from '@/lib/pin'

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ filename: string }> }
) {
    try {
        const { filename } = await context.params
        // Prevent path traversal; only allow a bare filename.
        if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }
        const filepath = path.join(getPinsDir(), filename)
        const file = await readFile(filepath)
        return new NextResponse(new Uint8Array(file), {
            headers: { 'Content-Type': 'image/png' }
        })
    } catch {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
}
