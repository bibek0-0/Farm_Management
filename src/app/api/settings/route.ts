import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AdminSettings from '@/models/AdminSettings';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Find current authenticated user
    let user = null;
    if (session.user.id) {
      user = await AdminSettings.findById(session.user.id).select('username role name updatedAt createdAt').lean();
    }
    if (!user && session.user.username) {
      user = await AdminSettings.findOne({ username: session.user.username.toLowerCase().trim() })
        .select('username role name updatedAt createdAt')
        .lean();
    }

    if (!user) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    const isUpperAdmin = user.role === 'upper_admin';
    let managedAdmins: Array<{
      id: string;
      username: string;
      role: string;
      name?: string;
      updatedAt?: Date;
    }> = [];

    // If Upper Admin, fetch other accounts that can be managed
    if (isUpperAdmin) {
      const otherAdmins = await AdminSettings.find({ _id: { $ne: user._id } })
        .select('username role name updatedAt createdAt')
        .lean();

      managedAdmins = otherAdmins.map((doc) => ({
        id: doc._id.toString(),
        username: doc.username,
        role: doc.role || 'admin',
        name: doc.name,
        updatedAt: doc.updatedAt,
      }));
    }

    return NextResponse.json({
      username: user.username,
      role: user.role || 'admin',
      name: user.name || user.username,
      isUpperAdmin,
      managedAdmins,
    });
  } catch (error) {
    console.error('[GET /api/settings]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      action,
      // Self update fields:
      currentPassword,
      newUsername,
      newPassword,
      // Upper Admin managing other admin fields:
      targetUsername,
      targetUserId,
      adminNewUsername,
      adminNewPassword,
      upperAdminPassword,
    } = body as {
      action?: 'update_self' | 'manage_admin';
      currentPassword?: string;
      newUsername?: string;
      newPassword?: string;
      targetUsername?: string;
      targetUserId?: string;
      adminNewUsername?: string;
      adminNewPassword?: string;
      upperAdminPassword?: string;
    };

    // Find current logged-in user doc
    let currentUser = null;
    if (session.user.id) {
      currentUser = await AdminSettings.findById(session.user.id);
    }
    if (!currentUser && session.user.username) {
      currentUser = await AdminSettings.findOne({ username: session.user.username.toLowerCase().trim() });
    }

    if (!currentUser) {
      return NextResponse.json({ error: 'Authenticated user not found' }, { status: 404 });
    }

    // ACTION: Upper Admin managing or resetting standard Admin account
    if (action === 'manage_admin') {
      if (currentUser.role !== 'upper_admin') {
        return NextResponse.json(
          { error: 'Forbidden: Only Upper Admin can manage other admin accounts.' },
          { status: 403 }
        );
      }

      if (!upperAdminPassword) {
        return NextResponse.json(
          { error: 'Upper Admin password is required to authorize this action.' },
          { status: 400 }
        );
      }

      const isUpperMatch = await bcrypt.compare(upperAdminPassword, currentUser.passwordHash);
      if (!isUpperMatch) {
        return NextResponse.json(
          { error: 'Incorrect Upper Admin password.' },
          { status: 403 }
        );
      }

      let targetAdmin = null;
      if (targetUserId) {
        targetAdmin = await AdminSettings.findById(targetUserId);
      } else if (targetUsername) {
        targetAdmin = await AdminSettings.findOne({ username: targetUsername.toLowerCase().trim() });
      }

      if (!targetAdmin) {
        return NextResponse.json({ error: 'Target admin account not found.' }, { status: 404 });
      }

      if (targetAdmin._id.toString() === currentUser._id.toString()) {
        return NextResponse.json(
          { error: 'Use the standard account form to update your own profile.' },
          { status: 400 }
        );
      }

      if (targetAdmin.role === 'upper_admin') {
        return NextResponse.json(
          { error: 'Cannot modify another upper admin account.' },
          { status: 403 }
        );
      }

      // Update target admin username
      if (adminNewUsername && adminNewUsername.trim()) {
        const formatted = adminNewUsername.trim().toLowerCase();
        const existing = await AdminSettings.findOne({
          username: formatted,
          _id: { $ne: targetAdmin._id },
        });
        if (existing) {
          return NextResponse.json({ error: `Username "${formatted}" is already taken.` }, { status: 400 });
        }
        targetAdmin.username = formatted;
      }

      // Update target admin password
      if (adminNewPassword && adminNewPassword.trim()) {
        if (adminNewPassword.trim().length < 4) {
          return NextResponse.json(
            { error: 'Password must be at least 4 characters long.' },
            { status: 400 }
          );
        }
        const salt = await bcrypt.genSalt(12);
        targetAdmin.passwordHash = await bcrypt.hash(adminNewPassword.trim(), salt);
      }

      await targetAdmin.save();

      return NextResponse.json({
        success: true,
        message: `Admin account (${targetAdmin.username}) updated successfully.`,
      });
    }

    // ACTION: User updating their own profile / credentials
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required.' }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(currentPassword, currentUser.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 403 });
    }

    let updatedSomething = false;

    if (newUsername && newUsername.trim()) {
      const formatted = newUsername.trim().toLowerCase();
      if (formatted !== currentUser.username) {
        const existing = await AdminSettings.findOne({
          username: formatted,
          _id: { $ne: currentUser._id },
        });
        if (existing) {
          return NextResponse.json({ error: `Username "${formatted}" is already in use.` }, { status: 400 });
        }
        currentUser.username = formatted;
        updatedSomething = true;
      }
    }

    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 4) {
        return NextResponse.json({ error: 'New password must be at least 4 characters.' }, { status: 400 });
      }
      const salt = await bcrypt.genSalt(12);
      currentUser.passwordHash = await bcrypt.hash(newPassword.trim(), salt);
      updatedSomething = true;
    }

    if (!updatedSomething) {
      return NextResponse.json(
        { error: 'Provide a new username or new password to update.' },
        { status: 400 }
      );
    }

    await currentUser.save();

    return NextResponse.json({
      success: true,
      message: 'Account credentials updated successfully.',
      username: currentUser.username,
    });
  } catch (error) {
    console.error('[PUT /api/settings]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
