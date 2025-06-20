import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import BlacklistHistory from '@/models/BlacklistHistory';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
      await connectDB();
      
      const { searchParams } = new URL(request.url);
      const days = parseInt(searchParams.get('days') || '30');
      
      // Get stats
      const stats = await BlacklistHistory.getStats(days);
      
      // Get current blacklist counts
      const currentCounts = await Customer.aggregate([
        {
          $match: {
            isBlacklisted: true,
            'blacklistDetails.isActive': true
          }
        },
        {
          $group: {
            _id: '$blacklistDetails.severity',
            count: { $sum: 1 }
          }
        }
      ]);
      
      // Get recent activity
      const recentActivity = await BlacklistHistory.getRecentActivity(10);
      
      return NextResponse.json({
        success: true,
        stats,
        currentCounts,
        recentActivity
      });
      
    } catch (error) {
      console.error('Blacklist stats API error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }