import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MilkEntry from '@/models/MilkEntry';
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

    const entry = await MilkEntry.findById(id).populate('farmer', 'name farmerCode').lean();
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('[GET /api/entries/[id]]', error);
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

    const quantity = Number(body.quantity ?? body.quantityLiters);
    const rate = Number(body.rate ?? body.ratePerLiter);
    const fat = body.fat !== undefined && body.fat !== null && body.fat !== '' ? Number(body.fat) : null;
    const snf = body.snf !== undefined && body.snf !== null && body.snf !== '' ? Number(body.snf) : null;

    if (isNaN(quantity) || isNaN(rate) || quantity <= 0 || rate < 0) {
      return NextResponse.json(
        { error: 'Valid quantity and rate are required' },
        { status: 400 }
      );
    }

    const totalAmount = Number((quantity * rate).toFixed(2));

    const entry = await MilkEntry.findByIdAndUpdate(
      id,
      {
        $set: {
          quantityLiters: quantity,
          ratePerLiter: rate,
          totalAmount,
          fat,
          snf,
        },
      },
      { new: true }
    )
      .populate('farmer', 'name farmerCode')
      .lean();

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      entry: {
        ...entry,
        quantity: entry.quantityLiters,
        rate: entry.ratePerLiter,
        amount: entry.totalAmount,
        fat: entry.fat ?? null,
        snf: entry.snf ?? null,
      },
    });
  } catch (error) {
    console.error('[PUT /api/entries/[id]]', error);
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

    const entry = await MilkEntry.findByIdAndDelete(id).lean();
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/entries/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
