// src/services/BookingService.js
import { PricingService } from './PricingService.js';
import { SettingsService } from './SettingsService.js';
import connectDB from '@/lib/db';

// 🔌 Lazy load models to avoid import issues
let Booking, Vehicle, Customer;

const getModels = async () => {
  if (!Booking) {
    await connectDB();
    Booking = (await import('@/models/Booking')).default;
    Vehicle = (await import('@/models/Vehicle')).default;
    Customer = (await import('@/models/Customer')).default;
  }
  return { Booking, Vehicle, Customer };
};

/**
 * Centralized Booking Service
 * Handles all booking operations with pricing integration and error handling
 */
export class BookingService {
  
  /**
   * Calculate current amount for active booking
   * ✅ FULLY INTEGRATED with database models
   */
  static async calculateCurrentAmount(bookingId) {
    try {
      const { Booking } = await getModels();
      
      const booking = await Booking.findById(bookingId)
        .populate('vehicleId', 'type model plateNumber status')
        .populate('customerId', 'name phone driverLicense');
      
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Handle cancelled bookings
      if (booking.status === 'cancelled') {
        return {
          success: true,
          currentAmount: 0,
          breakdown: [],
          totalMinutes: 0,
          totalHours: 0,
          summary: 'Cancelled - No charge applied',
          status: 'cancelled',
          message: 'This booking has been cancelled. No amount calculation is applicable.'
        };
      }

      // Check if booking is not active
      if (booking.status !== 'active') {
        return {
          success: false,
          error: `Cannot calculate current amount for ${booking.status} booking. Only active bookings are supported.`,
          status: booking.status
        };
      }

      // Use PricingService for calculation
      const pricingResult = await PricingService.calculateAdvancedPricing(booking.startTime, new Date());
      
      return {
        success: true,
        currentAmount: pricingResult.totalAmount,
        breakdown: pricingResult.breakdown,
        totalMinutes: pricingResult.totalMinutes,
        totalHours: Math.ceil(pricingResult.totalMinutes / 60),
        summary: pricingResult.summary,
        status: booking.status,
        message: 'Live amount calculation for active booking'
      };

    } catch (error) {
      console.error('BookingService.calculateCurrentAmount error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Complete booking with pricing calculation
   * ✅ FULLY INTEGRATED with database models and vehicle status updates
   */
  static async completeBooking(bookingId, completionData) {
    try {
      const { Booking } = await getModels();
      
      const booking = await Booking.findById(bookingId)
        .populate('vehicleId', 'type model plateNumber status')
        .populate('customerId', 'name phone driverLicense');
      
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.status !== 'active') {
        throw new Error('Booking is not active');
      }

      const endTime = new Date(completionData.endTime || new Date());

      // Use PricingService for calculation
      const pricingResult = await PricingService.calculateAdvancedPricing(booking.startTime, endTime);
      let finalAmount = pricingResult.totalAmount;

      // Apply adjustments
      if (completionData.discountAmount) finalAmount -= completionData.discountAmount;
      if (completionData.additionalCharges) finalAmount += completionData.additionalCharges;
      finalAmount = Math.max(0, finalAmount);

      const actualDurationHours = Math.ceil(pricingResult.totalMinutes / 60);

      // Update booking record
      booking.endTime = endTime;
      booking.actualDuration = actualDurationHours;
      booking.finalAmount = finalAmount;
      booking.paymentMethod = completionData.paymentMethod;
      booking.status = 'completed';
      booking.pricingBreakdown = pricingResult.breakdown;

      // Add optional fields
      if (completionData.vehicleCondition) booking.vehicleCondition = completionData.vehicleCondition;
      if (completionData.returnNotes) booking.returnNotes = completionData.returnNotes;
      if (completionData.damageNotes) booking.damageNotes = completionData.damageNotes;
      if (completionData.discountAmount) booking.discountAmount = completionData.discountAmount;
      if (completionData.additionalCharges) booking.additionalCharges = completionData.additionalCharges;

      await booking.save();

      // Update vehicle status using safe method
      const vehicleUpdateResult = await this.updateVehicleStatusSafely(
        booking.vehicleId._id,
        'available',
        `booking completion for ${booking.bookingId}`
      );

      // Get updated booking with populated fields
      const updatedBooking = await Booking.findById(bookingId)
        .populate('vehicleId', 'type model plateNumber status')
        .populate('customerId', 'name phone driverLicense');

      return {
        success: true,
        booking: updatedBooking,
        pricingDetails: pricingResult,
        vehicleStatusUpdate: vehicleUpdateResult,
        message: `Booking completed successfully. Final amount: ₹${finalAmount}`,
        warnings: vehicleUpdateResult.success ? [] : [
          `Vehicle ${booking.vehicleId.model} (${booking.vehicleId.plateNumber}) status may not have updated correctly. Please verify manually.`
        ]
      };

    } catch (error) {
      console.error('BookingService.completeBooking error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create new booking with pricing validation
   * ✅ FULLY INTEGRATED with database models
   */
  static async createBooking(bookingData) {
    try {
      const { Booking, Vehicle, Customer } = await getModels();
      
      // Calculate rental start time using settings
      const startTime = await SettingsService.calculateRentalStartTime(new Date());
      
      // Validate booking data
      const validation = this.validateBookingData(bookingData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Verify vehicle exists and is available
      const vehicle = await Vehicle.findById(bookingData.vehicleId);
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }
      if (vehicle.status !== 'available') {
        throw new Error('Vehicle is not available');
      }

      // Verify customer exists
      const customer = await Customer.findById(bookingData.customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }
      if (customer.isBlacklisted && 
          (!customer.blacklistDetails || customer.blacklistDetails.severity !== 'warning')) {
        throw new Error('Customer is blacklisted and cannot make bookings');
      }

      // Check for active bookings for this customer
      const activeBooking = await Booking.findOne({
        customerId: bookingData.customerId,
        status: 'active'
      });

      if (activeBooking) {
        throw new Error('Customer already has an active booking');
      }

      // Create booking
      const newBooking = new Booking({
        ...bookingData,
        startTime,
        status: 'active',
        createdAt: new Date()
      });

      await newBooking.save();

      // Update vehicle status
      const vehicleUpdateResult = await this.updateVehicleStatusSafely(
        vehicle._id,
        'rented',
        `new booking ${newBooking.bookingId}`
      );

      // Get populated booking
      const populatedBooking = await Booking.findById(newBooking._id)
        .populate('vehicleId', 'type model plateNumber status')
        .populate('customerId', 'name phone driverLicense');

      // Include warning if customer has warning status
      let warningInfo = null;
      if (customer.isBlacklisted && 
          customer.blacklistDetails?.isActive && 
          customer.blacklistDetails.severity === 'warning') {
        warningInfo = {
          reason: customer.blacklistDetails.reason,
          customReason: customer.blacklistDetails.customReason,
          blacklistedAt: customer.blacklistDetails.blacklistedAt,
          blacklistedBy: customer.blacklistDetails.blacklistedBy,
          message: 'Customer has a warning on their account. Please monitor this booking carefully.'
        };
      }

      return {
        success: true,
        booking: populatedBooking,
        rentalStartTime: startTime.toISOString(),
        message: `Booking created successfully. Rental starts at ${startTime.toLocaleString('en-IN')}`,
        warning: warningInfo,
        vehicleStatusUpdate: vehicleUpdateResult
      };

    } catch (error) {
      console.error('BookingService.createBooking error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get pricing preview for booking duration
   */
  static async getPricingPreview(durationMinutes, startTime = new Date()) {
    try {
      const result = await PricingService.calculatePricingPreview(durationMinutes, startTime);
      return {
        success: true,
        ...result
      };
    } catch (error) {
      console.error('BookingService.getPricingPreview error:', error);
      return {
        success: false,
        error: error.message,
        totalAmount: 0,
        breakdown: [],
        summary: 'Error calculating preview'
      };
    }
  }

  /**
   * Get pricing examples for UI
   */
  static async getPricingExamples() {
    try {
      const result = await PricingService.getPricingExamples();
      return {
        success: true,
        ...result
      };
    } catch (error) {
      console.error('BookingService.getPricingExamples error:', error);
      return {
        success: false,
        error: error.message,
        day: [],
        night: [],
        settings: SettingsService.DEFAULT_SETTINGS
      };
    }
  }

  /**
   * Cancel booking
   * ✅ NEW: Complete cancellation logic
   */
  static async cancelBooking(bookingId, cancellationData) {
    try {
      const { Booking } = await getModels();
      
      const booking = await Booking.findById(bookingId)
        .populate('vehicleId', 'type model plateNumber status')
        .populate('customerId', 'name phone driverLicense');
      
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.status !== 'active') {
        throw new Error('Booking is not active and cannot be cancelled');
      }

      // Update booking status
      booking.status = 'cancelled';
      booking.cancellationDetails = {
        cancelledAt: new Date(),
        cancelledBy: cancellationData.cancelledBy || 'system',
        reason: cancellationData.reason || 'customer_changed_mind',
        customReason: cancellationData.customReason || '',
        notes: cancellationData.notes || ''
      };

      await booking.save();

      // Update vehicle status back to available
      const vehicleUpdateResult = await this.updateVehicleStatusSafely(
        booking.vehicleId._id,
        'available',
        `booking cancellation for ${booking.bookingId}`
      );

      return {
        success: true,
        booking,
        vehicleStatusUpdate: vehicleUpdateResult,
        message: 'Booking cancelled successfully'
      };

    } catch (error) {
      console.error('BookingService.cancelBooking error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get booking by ID
   * ✅ IMPLEMENTED
   */
  static async getBookingById(bookingId) {
    try {
      const { Booking } = await getModels();
      
      return await Booking.findById(bookingId)
        .populate('vehicleId', 'type model plateNumber status')
        .populate('customerId', 'name phone driverLicense');
    } catch (error) {
      console.error('BookingService.getBookingById error:', error);
      throw error;
    }
  }

  /**
   * Get booking by booking ID (string)
   * ✅ NEW: Support for bookingId string lookup
   */
  static async getBookingByBookingId(bookingIdString) {
    try {
      const { Booking } = await getModels();
      
      return await Booking.findOne({ bookingId: bookingIdString })
        .populate('vehicleId', 'type model plateNumber status')
        .populate('customerId', 'name phone driverLicense');
    } catch (error) {
      console.error('BookingService.getBookingByBookingId error:', error);
      throw error;
    }
  }

  /**
   * Safe vehicle status update - COPIED FROM YOUR EXISTING CODE
   * ✅ INTEGRATED: Uses your bulletproof vehicle update logic
   */
  static async updateVehicleStatusSafely(vehicleId, newStatus, context = '') {
    const { Vehicle } = await getModels();
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries}: Updating vehicle ${vehicleId} to ${newStatus} (${context})`);
        
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
          throw new Error(`Vehicle with ID ${vehicleId} not found`);
        }

        console.log(`📋 Vehicle ${vehicle.plateNumber} current status: ${vehicle.status} → ${newStatus}`);

        const updateResult = await Vehicle.findByIdAndUpdate(
          vehicleId,
          { status: newStatus },
          { 
            new: true,
            runValidators: true,
            upsert: false
          }
        );

        if (!updateResult) {
          throw new Error(`Vehicle update returned null for ID ${vehicleId}`);
        }

        const verificationCheck = await Vehicle.findById(vehicleId);
        if (!verificationCheck || verificationCheck.status !== newStatus) {
          throw new Error(`Verification failed: Vehicle ${vehicleId} status is ${verificationCheck?.status}, expected ${newStatus}`);
        }

        console.log(`✅ Vehicle ${vehicle.plateNumber} successfully updated to ${newStatus}`);
        return {
          success: true,
          previousStatus: vehicle.status,
          newStatus: verificationCheck.status,
          plateNumber: vehicle.plateNumber,
          attempts: attempt
        };

      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed for vehicle ${vehicleId}:`, error.message);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    console.error(`💥 CRITICAL: Failed to update vehicle ${vehicleId} after ${maxRetries} attempts. Last error:`, lastError.message);
    return {
      success: false,
      error: lastError.message,
      attempts: maxRetries
    };
  }

  // ===== VALIDATION METHODS =====

  /**
   * Validate booking data
   */
  static validateBookingData(bookingData) {
    const errors = [];

    if (!bookingData.vehicleId) {
      errors.push('Vehicle ID is required');
    }

    if (!bookingData.customerId) {
      errors.push('Customer ID is required');
    }

    if (!bookingData.signature) {
      errors.push('Signature is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ===== UTILITY METHODS =====

  /**
   * Format currency
   */
  static formatCurrency(amount) {
    return PricingService.formatCurrency(amount);
  }

  /**
   * Calculate late fees
   */
  static async calculateLateFee(overHours) {
    try {
      const lateFeePerHour = await SettingsService.getSetting('lateFeePerHour', 20);
      return Math.ceil(overHours) * lateFeePerHour;
    } catch (error) {
      console.error('Error calculating late fee:', error);
      return Math.ceil(overHours) * 20; // Fallback rate
    }
  }

  /**
   * Check if booking is overdue
   */
  static isBookingOverdue(booking) {
    if (booking.status !== 'active' || !booking.expectedReturnTime) {
      return false;
    }
    
    return new Date() > new Date(booking.expectedReturnTime);
  }

  /**
   * Get booking statistics
   * ✅ IMPLEMENTED: Basic stats for dashboard
   */
  static async getBookingStats(period = 'today') {
    try {
      const { Booking } = await getModels();
      
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'today':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
        default:
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
      }

      const bookings = await Booking.find({
        createdAt: { $gte: startDate }
      });

      const stats = {
        total: bookings.length,
        active: bookings.filter(b => b.status === 'active').length,
        completed: bookings.filter(b => b.status === 'completed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
        totalRevenue: bookings
          .filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + (b.finalAmount || 0), 0)
      };

      return {
        success: true,
        period,
        stats,
        startDate
      };

    } catch (error) {
      console.error('BookingService.getBookingStats error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get overdue bookings
   * ✅ NEW: Find bookings that should have been returned
   */
  static async getOverdueBookings() {
    try {
      const { Booking } = await getModels();
      
      const overdueBookings = await Booking.find({
        status: 'active',
        expectedReturnTime: { $lt: new Date() }
      })
      .populate('vehicleId', 'type model plateNumber')
      .populate('customerId', 'name phone');

      return {
        success: true,
        bookings: overdueBookings,
        count: overdueBookings.length
      };

    } catch (error) {
      console.error('BookingService.getOverdueBookings error:', error);
      return {
        success: false,
        error: error.message,
        bookings: [],
        count: 0
      };
    }
  }

  /**
   * Update booking notes
   * ✅ NEW: Update additional notes for active bookings
   */
  static async updateBookingNotes(bookingId, notes) {
    try {
      const { Booking } = await getModels();
      
      const booking = await Booking.findByIdAndUpdate(
        bookingId,
        { additionalNotes: notes },
        { new: true }
      )
      .populate('vehicleId', 'type model plateNumber status')
      .populate('customerId', 'name phone driverLicense');

      if (!booking) {
        throw new Error('Booking not found');
      }

      return {
        success: true,
        booking,
        message: 'Booking notes updated successfully'
      };

    } catch (error) {
      console.error('BookingService.updateBookingNotes error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}