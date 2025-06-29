// src/services/BookingService.js
import { PricingService } from './PricingService.js';
import { SettingsService } from './SettingsService.js';

/**
 * Centralized Booking Service
 * Handles all booking operations with pricing integration and error handling
 */
export class BookingService {
  
  /**
   * Calculate current amount for active booking
   * Replaces inline calculations in API routes
   */
  static async calculateCurrentAmount(bookingId) {
    try {
      // This will be populated when we integrate with your Booking model
      // For now, this is the interface that API routes will use
      const booking = await this.getBookingById(bookingId);
      
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
   * Replaces logic in booking completion API
   */
  static async completeBooking(bookingId, completionData) {
    try {
      const booking = await this.getBookingById(bookingId);
      
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.status !== 'active') {
        throw new Error('Booking is not active');
      }

      const endTime = new Date(completionData.endTime || new Date());

      // Use PricingService for calculation (advanced version)
      const pricingResult = await PricingService.calculateAdvancedPricing(booking.startTime, endTime);
      let finalAmount = pricingResult.totalAmount;

      // Apply adjustments
      if (completionData.discountAmount) finalAmount -= completionData.discountAmount;
      if (completionData.additionalCharges) finalAmount += completionData.additionalCharges;
      finalAmount = Math.max(0, finalAmount);

      const actualDurationHours = Math.ceil(pricingResult.totalMinutes / 60);

      // Prepare booking update data
      const updateData = {
        endTime,
        actualDuration: actualDurationHours,
        finalAmount,
        paymentMethod: completionData.paymentMethod,
        status: 'completed',
        pricingBreakdown: pricingResult.breakdown
      };

      // Add optional fields
      if (completionData.vehicleCondition) updateData.vehicleCondition = completionData.vehicleCondition;
      if (completionData.returnNotes) updateData.returnNotes = completionData.returnNotes;
      if (completionData.damageNotes) updateData.damageNotes = completionData.damageNotes;
      if (completionData.discountAmount) updateData.discountAmount = completionData.discountAmount;
      if (completionData.additionalCharges) updateData.additionalCharges = completionData.additionalCharges;

      // Update booking and vehicle status
      const result = await this.updateBookingAndVehicle(bookingId, updateData);

      return {
        success: true,
        booking: result.booking,
        pricingDetails: pricingResult,
        vehicleStatusUpdate: result.vehicleUpdate,
        message: `Booking completed successfully. Final amount: ₹${finalAmount}`,
        warnings: result.warnings || []
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
   */
  static async createBooking(bookingData) {
    try {
      // Calculate rental start time using settings
      const startTime = await SettingsService.calculateRentalStartTime(new Date());
      
      // Validate booking data
      const validation = this.validateBookingData(bookingData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Prepare booking with calculated start time
      const enrichedBookingData = {
        ...bookingData,
        startTime,
        status: 'active'
      };

      // Create booking and update vehicle status
      const result = await this.createBookingAndUpdateVehicle(enrichedBookingData);

      return {
        success: true,
        booking: result.booking,
        rentalStartTime: startTime.toISOString(),
        message: `Booking created successfully. Rental starts at ${startTime.toLocaleString('en-IN')}`,
        warning: result.warning
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

  // ===== INTEGRATION METHODS =====
  // These methods will be implemented to integrate with your existing models

  /**
   * Get booking by ID (to be integrated with your Booking model)
   */
  static async getBookingById(bookingId) {
    // TODO: Integrate with your Booking model
    // const Booking = require('@/models/Booking');
    // return await Booking.findById(bookingId)
    //   .populate('vehicleId', 'type model plateNumber status')
    //   .populate('customerId', 'name phone driverLicense');
    
    // Placeholder for now
    throw new Error('getBookingById not yet integrated - needs Booking model import');
  }

  /**
   * Update booking and vehicle status (to be integrated)
   */
  static async updateBookingAndVehicle(bookingId, updateData) {
    // TODO: Integrate with your models and transaction logic
    // This will include:
    // 1. Update booking record
    // 2. Update vehicle status to 'available'
    // 3. Handle any errors with rollback
    
    // Placeholder for now
    throw new Error('updateBookingAndVehicle not yet integrated - needs model integration');
  }

  /**
   * Create booking and update vehicle (to be integrated)
   */
  static async createBookingAndUpdateVehicle(bookingData) {
    // TODO: Integrate with your booking creation logic
    // This will include:
    // 1. Create booking record
    // 2. Update vehicle status to 'rented'
    // 3. Handle customer warnings
    // 4. Rollback on any errors
    
    // Placeholder for now
    throw new Error('createBookingAndUpdateVehicle not yet integrated - needs model integration');
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
   */
  static async getBookingStats(period = 'today') {
    // TODO: Implement with your database queries
    // This will provide stats for dashboard
    throw new Error('getBookingStats not yet implemented');
  }
}