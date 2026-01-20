import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
    ERR_UNAUTHORIZED,
    ERR_BAD_REQUEST,
    ERR_INTERNAL,
    successResponse,
} from '@/lib/errors';

export async function POST(request: NextRequest) {
    const auth = await getSession();
    if (!auth) {
        return ERR_UNAUTHORIZED();
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as Blob | null;
        const type = formData.get('type') as 'post_cover' | 'avatar' | null;

        if (!file || !type) {
            return ERR_BAD_REQUEST('File and type are required');
        }

        const uploadId = uuidv4();
        const extension = file.type.split('/')[1] || 'png';
        const filename = `${uploadId}.${extension}`;

        // We store in public/uploads so Next.js can serve it
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        const filePath = path.join(uploadDir, filename);

        // Ensure directory exists
        await fs.mkdir(uploadDir, { recursive: true });

        // Write file
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filePath, buffer);

        const publicUrl = `/uploads/${filename}`;

        const upload = await prisma.upload.create({
            data: {
                id: uploadId,
                type: type as any,
                publicUrl,
                s3Key: `local://${filename}`, // Mark as local for clarity
                contentType: file.type,
                createdBy: auth.user.id,
            },
        });

        console.log(`[LocalUpload] Saved to ${publicUrl}`);

        return successResponse({
            upload: {
                uploadId: upload.id,
                publicUrl: upload.publicUrl,
            },
        });
    } catch (error: any) {
        console.error('[LocalUpload] Error:', error);
        return ERR_INTERNAL(error.message || 'Local upload failed');
    }
}
