import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'lastVisit';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Build search query
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
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Fetch customers with search and sort
    const customers = await Customer.find(query)
      .sort(sort)
      .lean(); // Use lean() for better performance
    
    // Calculate additional stats for each customer
    const customersWithStats = customers.map(customer => ({
      ...customer,
      // Add any additional computed fields here if needed
    }));
    
    return NextResponse.json({ 
      success: true, 
      customers: customersWithStats 
    });
  } catch (error) {
    console.error('Customers API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const customer = new Customer(body);
    await customer.save();
    return NextResponse.json({ success: true, customer });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}