export const validatePhoneNumber = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };
  
  export const validateAadhar = (aadhar) => {
    const aadharRegex = /^\d{12}$/;
    return aadharRegex.test(aadhar);
  };
  
  export const validateDrivingLicense = (license) => {
    // Basic validation for Indian driving license
    const licenseRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11}$/;
    return licenseRegex.test(license);
  };
  
  export const formatAadhar = (aadhar) => {
    return aadhar.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
  };
  
  export const formatPhoneNumber = (phone) => {
    return phone.replace(/(\d{5})(\d{5})/, '$1-$2');
  };