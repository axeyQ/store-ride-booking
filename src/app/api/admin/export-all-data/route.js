import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Customer from '@/models/Customer';
import Vehicle from '@/models/Vehicle';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();
    
    // Fetch all data
    const [bookings, customers, vehicles] = await Promise.all([
      Booking.find({})
        .populate('vehicleId', 'type model plateNumber')
        .populate('customerId', 'name phone driverLicense')
        .sort({ createdAt: -1 }),
      Customer.find({}).sort({ name: 1 }),
      Vehicle.find({}).sort({ type: 1, model: 1 })
    ]);
    
    // Create comprehensive CSV data
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Bookings CSV
    const bookingsHeaders = [
      'Booking ID', 'Customer Name', 'Customer Phone', 'Driver License',
      'Vehicle Type', 'Vehicle Model', 'Plate Number', 'Start Time', 'End Time',
      'Duration (Hours)', 'Final Amount', 'Payment Method', 'Status',
      'Helmet Provided', 'Aadhar Collected', 'Vehicle Inspected',
      'Additional Notes', 'Created At'
    ];
    
    const bookingsRows = bookings.map(booking => {
      const calculateDuration = (startTime, endTime) => {
        if (!endTime) return '';
        const start = new Date(startTime);
        const end = new Date(endTime);
        return Math.ceil((end - start) / (1000 * 60 * 60));
      };
      
      return [
        booking.bookingId || '',
        booking.customerId?.name || 'Unknown',
        booking.customerId?.phone || '',
        booking.customerId?.driverLicense || '',
        booking.vehicleId?.type || '',
        booking.vehicleId?.model || '',
        booking.vehicleId?.plateNumber || '',
        booking.startTime ? new Date(booking.startTime).toLocaleString('en-IN') : '',
        booking.endTime ? new Date(booking.endTime).toLocaleString('en-IN') : '',
        booking.actualDuration || calculateDuration(booking.startTime, booking.endTime),
        booking.finalAmount || 0,
        booking.paymentMethod || '',
        booking.status || '',
        booking.helmetProvided ? 'Yes' : 'No',
        booking.aadharCardCollected ? 'Yes' : 'No',
        booking.vehicleInspected ? 'Yes' : 'No',
        booking.additionalNotes || '',
        booking.createdAt ? new Date(booking.createdAt).toLocaleString('en-IN') : ''
      ];
    });
    
    // Customers CSV
    const customersHeaders = [
      'Name', 'Phone Number', 'Driver License', 'Total Bookings',
      'Last Visit', 'Customer Since', 'Customer Tier'
    ];
    
    const customersRows = customers.map(customer => {
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
    
    // Vehicles CSV
    const vehiclesHeaders = [
      'Type', 'Model', 'Plate Number', 'Status', 'Added Date'
    ];
    
    const vehiclesRows = vehicles.map(vehicle => [
      vehicle.type || '',
      vehicle.model || '',
      vehicle.plateNumber || '',
      vehicle.status || '',
      vehicle.addedDate ? new Date(vehicle.addedDate).toLocaleString('en-IN') : ''
    ]);
    
    // Helper function to escape CSV fields
    const escapeCSVField = (field) => {
      if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };
    
    // Create CSV content for each sheet
    const createCSV = (headers, rows) => {
      return [
        headers.join(','),
        ...rows.map(row => row.map(escapeCSVField).join(','))
      ].join('\n');
    };
    
    const bookingsCSV = createCSV(bookingsHeaders, bookingsRows);
    const customersCSV = createCSV(customersHeaders, customersRows);
    const vehiclesCSV = createCSV(vehiclesHeaders, vehiclesRows);
    
    // Create summary statistics
    const summaryHeaders = ['Metric', 'Value'];
    const summaryRows = [
      ['Export Date', new Date().toLocaleString('en-IN')],
      ['Total Bookings', bookings.length],
      ['Active Bookings', bookings.filter(b => b.status === 'active').length],
      ['Completed Bookings', bookings.filter(b => b.status === 'completed').length],
      ['Total Customers', customers.length],
      ['VIP Customers', customers.filter(c => (c.totalBookings || 0) >= 20).length],
      ['Total Vehicles', vehicles.length],
      ['Available Vehicles', vehicles.filter(v => v.status === 'available').length],
      ['Total Revenue', bookings.reduce((sum, b) => sum + (b.finalAmount || 0), 0)],
      ['Average Booking Value', bookings.length > 0 ? Math.round(bookings.reduce((sum, b) => sum + (b.finalAmount || 0), 0) / bookings.length) : 0]
    ];
    
    const summaryCSV = createCSV(summaryHeaders, summaryRows);
    
    // Combine all data into a comprehensive export
    const fullExport = [
      '=== MR TRAVELS DATA EXPORT ===',
      `Export Date: ${new Date().toLocaleString('en-IN')}`,
      `Total Records: ${bookings.length + customers.length + vehicles.length}`,
      '',
      '=== SUMMARY STATISTICS ===',
      summaryCSV,
      '',
      '=== BOOKINGS DATA ===',
      bookingsCSV,
      '',
      '=== CUSTOMERS DATA ===',
      customersCSV,
      '',
      '=== VEHICLES DATA ===',
      vehiclesCSV
    ].join('\n');
    
    // Generate filename
    const filename = `MR_Travels_Complete_Export_${timestamp}.csv`;
    
    return new Response(fullExport, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('Export all data API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}