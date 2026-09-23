import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MilkSale from '@/models/MilkSale';
import { auth } from '@/lib/auth';
import { getTodayBS } from '@/lib/nepaliDate';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const shift = searchParams.get('shift') as 'morning' | 'evening' | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const buyerName = searchParams.get('buyerName');
    const paymentStatus = searchParams.get('paymentStatus') as 'paid' | 'pending' | null;

    const query: Record<string, unknown> = {};

    if (date) {
      query.date = date;
    } else if (startDate || endDate) {
      const dateFilter: Record<string, string> = {};
      if (startDate) dateFilter.$gte = startDate;
      if (endDate) dateFilter.$lte = endDate;
      query.date = dateFilter;
    }

    if (shift) {
      query.shift = shift;
    }

    if (buyerName && buyerName.trim() && buyerName !== 'all') {
      query.buyerName = { $regex: buyerName.trim(), $options: 'i' };
    }

    if (paymentStatus && ['paid', 'pending'].includes(paymentStatus)) {
      query.paymentStatus = paymentStatus;
    }

    const [sales, buyerNames] = await Promise.all([
      MilkSale.find(query).sort({ date: -1, createdAt: -1 }).lean(),
      MilkSale.distinct('buyerName'),
    ]);

    return NextResponse.json({ sales, buyerNames });
  } catch (error) {
    console.error('[GET /api/sales]', error);
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
    const { buyerName, date, shift, quantityLiters, ratePerLiter, paymentStatus, notes } = body;

    if (!buyerName || !buyerName.trim()) {
      return NextResponse.json({ error: 'Buyer name is required' }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // Future date check
    const todayBS = getTodayBS();
    if (date > todayBS) {
      return NextResponse.json(
        { error: 'भोलि वा भविष्यको मितिमा दूध बिक्री इन्ट्री गर्न मिल्दैन (Cannot record sales for future dates).' },
        { status: 400 }
      );
    }

    if (!shift || !['morning', 'evening'].includes(shift)) {
      return NextResponse.json({ error: 'Valid shift (morning or evening) is required' }, { status: 400 });
    }

    const qty = Number(quantityLiters);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 });
    }

    const rate = Number(ratePerLiter);
    if (isNaN(rate) || rate < 0) {
      return NextResponse.json({ error: 'Rate must be a non-negative number' }, { status: 400 });
    }

    const totalAmount = Number((qty * rate).toFixed(2));

    const sale = await MilkSale.create({
      buyerName: buyerName.trim(),
      date,
      shift,
      quantityLiters: qty,
      ratePerLiter: rate,
      totalAmount,
      paymentStatus: paymentStatus === 'pending' ? 'pending' : 'paid',
      notes: notes?.trim() || '',
    });

    return NextResponse.json({ sale, message: 'Sale recorded successfully' }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/sales]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Bulk update payment status (e.g. mark entire customer month as paid)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { ids, paymentStatus } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Array of sale IDs required' }, { status: 400 });
    }

    if (!paymentStatus || !['paid', 'pending'].includes(paymentStatus)) {
      return NextResponse.json({ error: 'Valid payment status required' }, { status: 400 });
    }

    const result = await MilkSale.updateMany(
      { _id: { $in: ids } },
      { $set: { paymentStatus } }
    );

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
      message: `${result.modifiedCount} sales updated to ${paymentStatus}`,
    });
  } catch (error) {
    console.error('[PUT /api/sales]', error);
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

    if (!id) {
      return NextResponse.json({ error: 'Sale id is required' }, { status: 400 });
    }

    const deleted = await MilkSale.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Sale record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Sale record deleted' });
  } catch (error) {
    console.error('[DELETE /api/sales]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
