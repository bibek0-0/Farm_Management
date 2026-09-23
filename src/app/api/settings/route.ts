import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AdminSettings from '@/models/AdminSettings';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const settings = await AdminSettings.findOne().select('username').lean();

    if (!settings) {
      return NextResponse.json({ error: 'Admin settings not found' }, { status: 404 });
    }

    return NextResponse.json({ username: (settings as { username: string }).username });
  } catch (error) {
    console.error('[GET /api/settings]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { currentPassword, newUsername, newPassword } = body as {
      currentPassword: string;
      newUsername?: string;
      newPassword?: string;
    };

    if (!currentPassword) {
      return NextResponse.json({ error: 'currentPassword is required' }, { status: 400 });
    }

    const settings = await AdminSettings.findOne();
    if (!settings) {
      return NextResponse.json({ error: 'Admin settings not found' }, { status: 404 });
    }

    // Verify current password against stored hash
    const isMatch = await bcrypt.compare(currentPassword, settings.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
    }

    const updateFields: Record<string, string> = {};

    if (newUsername && newUsername.trim()) {
      updateFields.username = newUsername.trim().toLowerCase();
    }

    if (newPassword && newPassword.trim()) {
      const salt = await bcrypt.genSalt(12);
      updateFields.passwordHash = await bcrypt.hash(newPassword.trim(), salt);
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: 'Provide at least newUsername or newPassword to update' },
        { status: 400 }
      );
    }

    await AdminSettings.findOneAndUpdate({}, { $set: updateFields });

    return NextResponse.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    console.error('[PUT /api/settings]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
