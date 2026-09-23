import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MilkSale from '@/models/MilkSale';
import { auth } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Sale id required' }, { status: 400 });
    }

    await connectDB();

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.buyerName !== undefined) updateData.buyerName = String(body.buyerName).trim();
    if (body.quantityLiters !== undefined) updateData.quantityLiters = Number(body.quantityLiters);
    if (body.ratePerLiter !== undefined) updateData.ratePerLiter = Number(body.ratePerLiter);
    if (body.paymentStatus !== undefined) updateData.paymentStatus = body.paymentStatus;
    if (body.notes !== undefined) updateData.notes = String(body.notes).trim();

    if (updateData.quantityLiters !== undefined || updateData.ratePerLiter !== undefined) {
      const existing = await MilkSale.findById(id);
      if (!existing) {
        return NextResponse.json({ error: 'Sale record not found' }, { status: 404 });
      }
      const qty = (updateData.quantityLiters as number) ?? existing.quantityLiters;
      const rate = (updateData.ratePerLiter as number) ?? existing.ratePerLiter;
      updateData.totalAmount = Number((qty * rate).toFixed(2));
    }

    const updated = await MilkSale.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!updated) {
      return NextResponse.json({ error: 'Sale record not found' }, { status: 404 });
    }

    return NextResponse.json({ sale: updated, message: 'Sale updated' });
  } catch (error) {
    console.error('[PUT /api/sales/[id]]', error);
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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Sale id required' }, { status: 400 });
    }

    await connectDB();

    const deleted = await MilkSale.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Sale record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Sale deleted' });
  } catch (error) {
    console.error('[DELETE /api/sales/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
