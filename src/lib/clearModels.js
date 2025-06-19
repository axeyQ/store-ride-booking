import mongoose from 'mongoose';

// Function to clear all cached models
export function clearCachedModels() {
  // Clear the models from mongoose
  Object.keys(mongoose.models).forEach(modelName => {
    delete mongoose.models[modelName];
  });
  
  // Clear from global cache if it exists
  if (global.mongoose) {
    global.mongoose = { conn: null, promise: null };
  }
  
  console.log('Cleared all cached models');
}

// Clean customer creation function
export function createCleanCustomer(customerData) {
  // Ensure we only include the required fields
  return {
    name: customerData.name,
    phone: customerData.phone,
    driverLicense: customerData.driverLicense,
    // Note: aadharCardPhoto will be added later in back office
  };
}