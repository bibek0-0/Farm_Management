import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Farmer from '@/models/Farmer';
import { auth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const farmer = await Farmer.findById(id).lean();

    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    return NextResponse.json({ farmer });
  } catch (error) {
    console.error('[GET /api/farmers/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();

    // Do not allow changing farmerCode to a duplicate
    if (body.farmerCode) {
      const conflict = await Farmer.findOne({
        farmerCode: body.farmerCode.trim().toUpperCase(),
        _id: { $ne: id },
      });
      if (conflict) {
        return NextResponse.json(
          { error: `Farmer code "${body.farmerCode}" is already used by another farmer` },
          { status: 409 }
        );
      }
      body.farmerCode = body.farmerCode.trim().toUpperCase();
    }

    if (body.name) {
      body.name = body.name.trim();
    }

    const farmer = await Farmer.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    return NextResponse.json({ farmer });
  } catch (error) {
    console.error('[PUT /api/farmers/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;

    // Permanently delete farmer
    const farmer = await Farmer.findByIdAndDelete(id).lean();

    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    // Also delete any associated milk entries
    try {
      const MilkEntry = (await import('@/models/MilkEntry')).default;
      await MilkEntry.deleteMany({ farmer: id });
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, message: 'Farmer and records deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/farmers/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
