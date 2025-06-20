import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit')) || 10;

    // Only search if query has at least 2 characters
    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        customers: []
      });
    }

    // Create case-insensitive regex for flexible searching
    const searchRegex = new RegExp(query.split('').join('.*'), 'i');
    
    // Search in name, phone, and driver license
    const customers = await Customer.find({
      $or: [
        { name: searchRegex },
        { phone: { $regex: query, $options: 'i' } },
        { driverLicense: { $regex: query, $options: 'i' } }
      ]
    })
    .select('name phone driverLicense totalBookings lastVisit createdAt')
    .sort({ 
      // Prioritize customers with more bookings and recent visits
      totalBookings: -1, 
      lastVisit: -1 
    })
    .limit(limit)
    .lean();

    // Add relevance scoring for better sorting
    const customersWithScore = customers.map(customer => {
      let score = 0;
      
      // Exact name match gets highest score
      if (customer.name.toLowerCase() === query.toLowerCase()) {
        score += 100;
      }
      // Name starts with query gets high score
      else if (customer.name.toLowerCase().startsWith(query.toLowerCase())) {
        score += 50;
      }
      // Phone match gets medium score
      else if (customer.phone.includes(query)) {
        score += 30;
      }
      // License match gets medium score
      else if (customer.driverLicense.toLowerCase().includes(query.toLowerCase())) {
        score += 30;
      }
      
      // Boost score for customers with more bookings
      score += Math.min(customer.totalBookings * 2, 20);
      
      // Boost score for recent customers
      const daysSinceLastVisit = Math.floor((new Date() - new Date(customer.lastVisit)) / (1000 * 60 * 60 * 24));
      if (daysSinceLastVisit < 30) {
        score += 10;
      }

      return {
        ...customer,
        relevanceScore: score
      };
    });

    // Sort by relevance score
    customersWithScore.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return NextResponse.json({
      success: true,
      customers: customersWithScore,
      query: query,
      totalResults: customersWithScore.length
    });

  } catch (error) {
    console.error('Customer search API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}