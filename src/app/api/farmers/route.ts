import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Farmer from '@/models/Farmer';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const activeFilter = searchParams.get('active');

    const query: Record<string, unknown> = {};
    if (activeFilter === 'true') {
      query.isActive = true;
    }

    const farmers = await Farmer.find(query).sort({ farmerCode: 1 }).lean();

    // Return the array directly to match client expectations
    return NextResponse.json(farmers);
  } catch (error) {
    console.error('[GET /api/farmers]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { farmerCode, name, defaultRate, phone, notes, isActive } = body;

    // Validate required fields
    if (!farmerCode || !name || defaultRate === undefined || defaultRate === null) {
      return NextResponse.json(
        { error: 'farmerCode, name, and defaultRate are required' },
        { status: 400 }
      );
    }

    // Check for duplicate farmerCode
    const existing = await Farmer.findOne({ farmerCode: farmerCode.trim().toUpperCase() });
    if (existing) {
      return NextResponse.json(
        { error: `Farmer code "${farmerCode}" already exists` },
        { status: 409 }
      );
    }

    const farmer = await Farmer.create({
      farmerCode: farmerCode.trim().toUpperCase(),
      name: name.trim(),
      defaultRate: Number(defaultRate),
      phone: phone?.trim() || '',
      notes: notes?.trim() || '',
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json({ farmer }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/farmers]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
