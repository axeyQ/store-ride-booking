import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    
    // Build search query (same as main customers API)
    let query = {};
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query = {
        $or: [
          { name: searchRegex },
          { phone: searchRegex },
          { driverLicense: searchRegex }
        ]
      };
    }
    
    // Fetch all matching customers
    const customers = await Customer.find(query)
      .sort({ lastVisit: -1 })
      .lean();
    
    // Convert to CSV
    const csvHeaders = [
      'Name',
      'Phone Number',
      'Driver License',
      'Total Bookings',
      'Last Visit',
      'Customer Since',
      'Customer Tier'
    ];
    
    const csvRows = customers.map(customer => {
      // Calculate customer tier
      const getTier = (bookings) => {
        if (bookings >= 20) return 'VIP';
        if (bookings >= 10) return 'Gold';
        if (bookings >= 5) return 'Silver';
        return 'New';
      };
      
      return [
        customer.name || '',
        customer.phone || '',
        customer.driverLicense || '',
        customer.totalBookings || 0,
        customer.lastVisit ? new Date(customer.lastVisit).toLocaleString('en-IN') : '',
        customer.createdAt ? new Date(customer.createdAt).toLocaleString('en-IN') : '',
        getTier(customer.totalBookings || 0)
      ];
    });
    
    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(field => 
          // Escape fields that contain commas or quotes
          typeof field === 'string' && (field.includes(',') || field.includes('"')) 
            ? `"${field.replace(/"/g, '""')}"` 
            : field
        ).join(',')
      )
    ].join('\n');
    
    // Generate filename with current date
    const filename = `MR_Travels_Customers_${new Date().toISOString().split('T')[0]}.csv`;
    
    // Return CSV response
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('Export customers API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}