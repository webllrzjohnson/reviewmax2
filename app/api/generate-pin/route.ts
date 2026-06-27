import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generatePinImage } from '@/lib/pin'
import { requireAdmin } from '@/lib/auth/session'

const GeneratePinSchema = z.object({
    title: z.string().min(1).max(500),
    category: z.string().min(1).max(200),
    rating: z.union([z.string().max(20), z.number()]),
    image: z.string().url().max(2000),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug').max(200),
})

export async function POST(req: NextRequest) {
    try {
        await requireAdmin()
    } catch {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = GeneratePinSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
        return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 })
    }

    const result = await generatePinImage(parsed.data)

    if (!result.ok) {
        console.error('Pin generation error:', result.error)
        return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        pin_image_url: result.pinImageUrl,
    })
}
