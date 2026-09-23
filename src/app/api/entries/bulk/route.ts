import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MilkEntry from '@/models/MilkEntry';
import { auth } from '@/lib/auth';
import mongoose from 'mongoose';
import { getTodayBS } from '@/lib/nepaliDate';

interface BulkEntryItem {
  farmerId: string;
  date: string; // YYYY-MM-DD
  shift: 'morning' | 'evening';
  quantityLiters: number;
  ratePerLiter: number;
  fat?: number | null;
  snf?: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const items = body.entries ?? body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Request body must be an array of entry objects or { entries: [...] }' },
        { status: 400 }
      );
    }

    // Normalize items to support both quantity and quantityLiters, rate and ratePerLiter, fat and snf
    const normalizedItems: BulkEntryItem[] = items.map((item: any) => ({
      farmerId: item.farmerId || item.farmer,
      date: item.date,
      shift: item.shift,
      quantityLiters: Number(item.quantityLiters ?? item.quantity ?? 0),
      ratePerLiter: Number(item.ratePerLiter ?? item.rate ?? 0),
      fat: item.fat !== undefined && item.fat !== null && item.fat !== '' ? Number(item.fat) : null,
      snf: item.snf !== undefined && item.snf !== null && item.snf !== '' ? Number(item.snf) : null,
    }));

    // Filter out zero-quantity entries
    const validItems = normalizedItems.filter(
      (item) => item.quantityLiters > 0 && item.farmerId && item.date && item.shift
    );

    if (validItems.length === 0) {
      return NextResponse.json({ saved: 0, message: 'No valid entries to save' });
    }

    // STRICT VALIDATION: Disallow entries for tomorrow or any future date
    const todayBS = getTodayBS();
    const adToday = new Date().toISOString().split('T')[0];

    const hasFutureDate = validItems.some((item) => {
      if (item.date.startsWith('208') || item.date.startsWith('209')) {
        return item.date > todayBS;
      }
      return item.date > adToday;
    });

    if (hasFutureDate) {
      return NextResponse.json(
        { error: 'भोलि वा भविष्यको मितिमा दूधको विवरण इन्ट्री गर्न मिल्दैन (Cannot enter milk details for tomorrow or future dates).' },
        { status: 400 }
      );
    }

    const bulkOps = validItems.map((item) => {
      const farmerId = new mongoose.Types.ObjectId(item.farmerId);
      const totalAmount = item.quantityLiters * item.ratePerLiter;
      return {
        updateOne: {
          filter: {
            farmer: farmerId,
            date:   item.date,
            shift:  item.shift,
          },
          update: {
            $set: {
              farmer:         farmerId,
              date:           item.date,
              shift:          item.shift,
              quantityLiters: item.quantityLiters,
              ratePerLiter:   item.ratePerLiter,
              totalAmount,
              fat:            item.fat ?? null,
              snf:            item.snf ?? null,
            },
          },
          upsert: true,
        },
      };
    });

    // Cast to any[] to satisfy Mongoose's strict generic overload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await MilkEntry.bulkWrite(bulkOps as any[]);
    const saved = (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0);

    return NextResponse.json({ saved, message: 'Entries saved successfully' });
  } catch (error) {
    console.error('[POST /api/entries/bulk]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
