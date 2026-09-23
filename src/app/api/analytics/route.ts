import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MilkEntry from '@/models/MilkEntry';
import Farmer from '@/models/Farmer';
import { auth } from '@/lib/auth';

import { getTodayBS, subtractDaysBS } from '@/lib/nepaliDate';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const today           = getTodayBS();
    const sevenDaysAgo    = subtractDaysBS(today, 7);
    const fourteenDaysAgo = subtractDaysBS(today, 14);
    const thirtyDaysAgo   = subtractDaysBS(today, 30);
    const adToday         = new Date().toISOString().split('T')[0];

    // ─── 1. Daily Trend (last 30 days) ────────────────────────────────────────
    const dailyTrend = await MilkEntry.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id:         '$date',
          totalLiters: { $sum: '$quantityLiters' },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ─── 2. Shift Comparison (last 14 days) ───────────────────────────────────
    const shiftComparison = await MilkEntry.aggregate([
      { $match: { date: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id:         { date: '$date', shift: '$shift' },
          totalLiters: { $sum: '$quantityLiters' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // ─── 3. Top Suppliers (last 30 days, top 10) ──────────────────────────────
    const topSuppliers = await MilkEntry.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id:         '$farmer',
          totalLiters: { $sum: '$quantityLiters' },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
      { $sort: { totalLiters: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from:         'farmers',
          localField:   '_id',
          foreignField: '_id',
          as:           'farmerInfo',
        },
      },
      { $unwind: { path: '$farmerInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id:         { $toString: '$_id' },
          farmerName:  { $ifNull: ['$farmerInfo.name', 'Unknown'] },
          farmerCode:  { $ifNull: ['$farmerInfo.farmerCode', '—'] },
          totalLiters: 1,
          totalAmount: 1,
        },
      },
    ]);

    // ─── 4. Aggregations for Today, 7-Day Weekly, Shifts, and Last Entered Farmer ─
    const [todayAgg, weeklyAgg, activeFarmerCount, latestEntryDoc, todayShiftAgg] = await Promise.all([
      MilkEntry.aggregate([
        { $match: { date: { $in: [today, adToday] } } },
        {
          $group: {
            _id:         null,
            totalLiters: { $sum: '$quantityLiters' },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
      ]),
      MilkEntry.aggregate([
        { $match: { date: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id:         null,
            totalLiters: { $sum: '$quantityLiters' },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
      ]),
      Farmer.countDocuments({ isActive: true }),
      MilkEntry.findOne()
        .sort({ updatedAt: -1, createdAt: -1 })
        .populate('farmer', 'name farmerCode')
        .lean(),
      MilkEntry.aggregate([
        { $match: { date: { $in: [today, adToday] } } },
        {
          $group: {
            _id: '$shift',
            liters: { $sum: '$quantityLiters' },
            amount: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const todayLiters = Number((todayAgg[0]?.totalLiters ?? 0).toFixed(2));
    const todayAmount = Number((todayAgg[0]?.totalAmount ?? 0).toFixed(2));
    const weeklyLiters = Number((weeklyAgg[0]?.totalLiters ?? 0).toFixed(2));
    const weeklyAmount = Number((weeklyAgg[0]?.totalAmount ?? 0).toFixed(2));

    const morningLiters = Number((todayShiftAgg.find((s) => s._id === 'morning')?.liters ?? 0).toFixed(2));
    const eveningLiters = Number((todayShiftAgg.find((s) => s._id === 'evening')?.liters ?? 0).toFixed(2));
    const morningCount = todayShiftAgg.find((s) => s._id === 'morning')?.count ?? 0;
    const eveningCount = todayShiftAgg.find((s) => s._id === 'evening')?.count ?? 0;

    // Detailed last entered farmer info
    const lastFarmerObj = latestEntryDoc?.farmer as { _id?: unknown; name?: string; farmerCode?: string } | null;
    const lastEntryFarmer = latestEntryDoc
      ? {
          farmerCode: lastFarmerObj?.farmerCode || '—',
          name: lastFarmerObj?.name || 'Unknown',
          shift: latestEntryDoc.shift,
          shiftLabel: latestEntryDoc.shift === 'morning' ? 'बिहानी' : 'बेलुकी',
          quantity: latestEntryDoc.quantityLiters,
          date: latestEntryDoc.date,
        }
      : null;

    const lastEntry = (latestEntryDoc as { createdAt?: Date; date?: string } | null)?.createdAt?.toISOString()
      || (latestEntryDoc as { date?: string } | null)?.date
      || null;

    return NextResponse.json({
      todayLiters,
      todayAmount,
      activeFarmers: activeFarmerCount,
      lastEntry,
      lastEntryFarmer,
      weeklyLiters,
      weeklyAmount,
      morningLiters,
      eveningLiters,
      morningCount,
      eveningCount,
      todaySummary: {
        totalLiters: todayLiters,
        totalAmount: todayAmount,
        activeFarmers: activeFarmerCount,
        lastEntryDate: lastEntry,
        lastEntryFarmer,
      },
      dailyTrend,
      shiftComparison,
      topSuppliers,
    });
  } catch (error) {
    console.error('[GET /api/analytics]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
