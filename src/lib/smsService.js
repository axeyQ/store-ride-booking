// src/lib/smsService.js
class SMSService {
    constructor() {
      this.authKey = process.env.MSG91_AUTH_KEY;
      this.templateId = process.env.MSG91_TEMPLATE_ID;
      this.baseUrl = 'https://api.msg91.com/api/v5';
    }
  
    async sendOTP(mobile, otp, customerName) {
      try {
        if (!this.authKey || !this.templateId) {
          console.log(`SMS Service not configured. OTP for ${customerName} (${mobile}): ${otp}`);
          return { success: true, message: 'OTP sent successfully (development mode)' };
        }
  
        const response = await fetch(`${this.baseUrl}/otp`, {
          method: 'POST',
          headers: {
            'authkey': this.authKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            template_id: this.templateId,
            mobile: `91${mobile}`, // India country code
            otp: otp,
            extra_param: {
              customer_name: customerName
            }
          })
        });
  
        const result = await response.json();
  
        if (response.ok && result.type === 'success') {
          return { 
            success: true, 
            message: 'OTP sent successfully',
            messageId: result.request_id 
          };
        } else {
          console.error('MSG91 API Error:', result);
          return { 
            success: false, 
            message: result.message || 'Failed to send OTP' 
          };
        }
  
      } catch (error) {
        console.error('SMS Service Error:', error);
        return { 
          success: false, 
          message: 'Network error while sending OTP' 
        };
      }
    }
  
    async sendCustomMessage(mobile, message) {
      try {
        if (!this.authKey) {
          console.log(`SMS to ${mobile}: ${message}`);
          return { success: true };
        }
  
        const response = await fetch(`${this.baseUrl}/flow/`, {
          method: 'POST',
          headers: {
            'authkey': this.authKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            flow_id: process.env.MSG91_FLOW_ID,
            sender: process.env.MSG91_SENDER_ID || 'MRTRVL',
            mobiles: `91${mobile}`,
            message: message
          })
        });
  
        const result = await response.json();
        return { success: response.ok, data: result };
  
      } catch (error) {
        console.error('SMS Service Error:', error);
        return { success: false, error: error.message };
      }
    }
  
    // Send booking confirmation SMS
    async sendBookingConfirmation(mobile, customerName, bookingId, vehicleNumber, pickupTime) {
      const message = `Hi ${customerName}, your booking ${bookingId} for ${vehicleNumber} is confirmed. Pickup time: ${pickupTime}. Thank you! - MR Travels`;
      return await this.sendCustomMessage(mobile, message);
    }
  
    // Send return reminder SMS
    async sendReturnReminder(mobile, customerName, vehicleNumber, expectedReturn) {
      const message = `Hi ${customerName}, gentle reminder to return ${vehicleNumber} by ${expectedReturn}. Late charges may apply. - MR Travels`;
      return await this.sendCustomMessage(mobile, message);
    }
  }
  
  export default new SMSService();
  