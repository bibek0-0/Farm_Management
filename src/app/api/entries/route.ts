import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MilkEntry from '@/models/MilkEntry';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const farmerId  = searchParams.get('farmerId');
    const startDate = searchParams.get('startDate');
    const endDate   = searchParams.get('endDate');
    const shift     = searchParams.get('shift') as 'morning' | 'evening' | null;
    const page      = Math.max(1, parseInt(searchParams.get('page')  || '1',  10));
    const limit     = Math.max(1, parseInt(searchParams.get('limit') || '50', 10));

    const query: Record<string, unknown> = {};

    if (farmerId)  query.farmer = farmerId;
    if (shift)     query.shift  = shift;

    if (startDate || endDate) {
      const dateFilter: Record<string, string> = {};
      if (startDate) dateFilter.$gte = startDate;
      if (endDate)   dateFilter.$lte = endDate;
      query.date = dateFilter;
    }

    const skip  = (page - 1) * limit;
    const total = await MilkEntry.countDocuments(query);

    const entries = await MilkEntry.find(query)
      .populate('farmer', 'name farmerCode')
      .sort({ date: -1, shift: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formatted = entries.map((e) => {
      const f = e.farmer as { _id?: unknown; name?: string; farmerCode?: string } | null;
      const fId = f?._id ? String(f._id) : (e.farmer ? String(e.farmer) : '');
      return {
        ...e,
        _id: String(e._id),
        farmerId: f ? f : fId,
        quantity: e.quantityLiters,
        rate: e.ratePerLiter,
        amount: e.totalAmount,
        fat: e.fat ?? null,
        snf: e.snf ?? null,
      };
    });

    return NextResponse.json({
      entries: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[GET /api/entries]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const farmerId = searchParams.get('farmerId');
    const date = searchParams.get('date');
    const shift = searchParams.get('shift') as 'morning' | 'evening' | null;

    if (id) {
      const deleted = await MilkEntry.findByIdAndDelete(id);
      if (!deleted) {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Entry deleted' });
    }

    if (farmerId && date && shift) {
      await MilkEntry.findOneAndDelete({ farmer: farmerId, date, shift });
      return NextResponse.json({ success: true, message: 'Entry deleted' });
    }

    return NextResponse.json({ error: 'Entry id or (farmerId, date, shift) required' }, { status: 400 });
  } catch (error) {
    console.error('[DELETE /api/entries]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
