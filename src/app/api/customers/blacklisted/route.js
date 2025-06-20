import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
      await connectDB();
      
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const search = searchParams.get('search') || '';
      const severity = searchParams.get('severity') || 'all';
      const reason = searchParams.get('reason') || 'all';
      
      // Build query
      let query = {
        isBlacklisted: true,
        'blacklistDetails.isActive': true
      };
      
      // Apply filters
      if (severity !== 'all') {
        query['blacklistDetails.severity'] = severity;
      }
      
      if (reason !== 'all') {
        query['blacklistDetails.reason'] = reason;
      }
      
      // Add search functionality
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { name: searchRegex },
          { phone: searchRegex },
          { driverLicense: searchRegex }
        ];
      }
      
      // Auto-unblacklist expired temporary bans
      await Customer.autoUnblacklistExpired();
      
      // Get blacklisted customers
      const skip = (page - 1) * limit;
      const [customers, total] = await Promise.all([
        Customer.find(query)
          .sort({ 'blacklistDetails.blacklistedAt': -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Customer.countDocuments(query)
      ]);
      
      return NextResponse.json({
        success: true,
        customers,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit)
      });
      
    } catch (error) {
      console.error('Blacklisted customers API error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }