export default function LoadingSpinner({ size = 'medium', text = 'Loading...' }) {
    const sizeClasses = {
      small: 'h-6 w-6',
      medium: 'h-8 w-8',
      large: 'h-12 w-12'
    };
  
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}></div>
        {text && <p className="text-gray-600 mt-3 text-lg">{text}</p>}
      </div>
    );
  }