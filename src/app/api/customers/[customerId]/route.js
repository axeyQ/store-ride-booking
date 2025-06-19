import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { customerId } = params;
    
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Customer detail API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { customerId } = params;
    const body = await request.json();
    
    const customer = await Customer.findByIdAndUpdate(
      customerId,
      body,
      { new: true, runValidators: true }
    );
    
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Customer update API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}