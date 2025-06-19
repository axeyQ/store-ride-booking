export const theme = {
    // Background Gradients
    backgrounds: {
      primary: "bg-gradient-to-br from-gray-900 via-black to-gray-900",
      card: "bg-gradient-to-br from-gray-800 to-gray-900",
      header: "bg-black/50 backdrop-blur-sm",
      footer: "bg-black/30 backdrop-blur-sm",
    },
  
    // Color System
    colors: {
      primary: {
        cyan: {
          bg: "from-cyan-500 to-cyan-400",
          border: "border-cyan-500/50",
          text: "text-cyan-400",
          badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
        },
        blue: {
          bg: "from-blue-500 to-blue-400", 
          border: "border-blue-500/50",
          text: "text-blue-400",
          badge: "bg-blue-500/20 text-blue-400 border-blue-500/30"
        },
        green: {
          bg: "from-green-500 to-green-400",
          border: "border-green-500/50", 
          text: "text-green-400",
          badge: "bg-green-500/20 text-green-400 border-green-500/30"
        },
        orange: {
          bg: "from-orange-500 to-orange-400",
          border: "border-orange-500/50",
          text: "text-orange-400", 
          badge: "bg-orange-500/20 text-orange-400 border-orange-500/30"
        },
        purple: {
          bg: "from-purple-500 to-purple-400",
          border: "border-purple-500/50",
          text: "text-purple-400",
          badge: "bg-purple-500/20 text-purple-400 border-purple-500/30"
        }
      },
  
      // Stats Colors
      stats: {
        revenue: {
          bg: "bg-gradient-to-r from-green-900/50 to-green-800/50",
          border: "border-green-700/50",
          text: "text-green-400",
          light: "text-green-200"
        },
        bookings: {
          bg: "bg-gradient-to-r from-blue-900/50 to-blue-800/50", 
          border: "border-blue-700/50",
          text: "text-blue-400",
          light: "text-blue-200"
        },
        vehicles: {
          bg: "bg-gradient-to-r from-purple-900/50 to-purple-800/50",
          border: "border-purple-700/50", 
          text: "text-purple-400",
          light: "text-purple-200"
        },
        customers: {
          bg: "bg-gradient-to-r from-orange-900/50 to-orange-800/50",
          border: "border-orange-700/50",
          text: "text-orange-400", 
          light: "text-orange-200"
        }
      }
    },
  
    // Component Styles
    components: {
      // Cards
      card: {
        base: "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700",
        hover: "hover:scale-105 transition-all duration-300",
        interactive: "cursor-pointer group"
      },
  
      // Buttons (Tablet Optimized)
      button: {
        primary: "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white min-h-[60px] px-8 py-4 text-lg font-semibold rounded-lg shadow-lg transition-all duration-200",
        secondary: "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white min-h-[60px] px-8 py-4 text-lg font-semibold rounded-lg shadow-lg transition-all duration-200",
        success: "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white min-h-[60px] px-8 py-4 text-lg font-semibold rounded-lg shadow-lg transition-all duration-200",
        danger: "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white min-h-[60px] px-8 py-4 text-lg font-semibold rounded-lg shadow-lg transition-all duration-200"
      },
  
      // Form Elements (Tablet Optimized)
      input: {
        base: "bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 min-h-[60px] px-4 py-4 text-lg rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500",
        error: "border-red-500 focus:ring-red-500 focus:border-red-500"
      },
  
      // Icons with Gradients
      icon: {
        primary: "w-16 h-16 bg-gradient-to-r rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform",
        small: "w-8 h-8 bg-gradient-to-r rounded-lg flex items-center justify-center"
      },
  
      // Status Badges
      status: {
        active: "bg-orange-500/20 text-orange-400 border-orange-500/30 px-3 py-1 rounded-full text-sm font-medium",
        completed: "bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1 rounded-full text-sm font-medium", 
        available: "bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1 rounded-full text-sm font-medium",
        rented: "bg-orange-500/20 text-orange-400 border-orange-500/30 px-3 py-1 rounded-full text-sm font-medium",
        maintenance: "bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1 rounded-full text-sm font-medium"
      }
    },
  
    // Layout
    layout: {
      header: "border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50",
      container: "container mx-auto px-6 py-8",
      grid: {
        stats: "grid grid-cols-2 md:grid-cols-4 gap-6",
        navigation: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
        form: "grid grid-cols-1 md:grid-cols-2 gap-6"
      }
    },
  
    // Typography
    typography: {
      hero: "text-4xl font-bold text-white",
      title: "text-2xl font-bold text-white", 
      subtitle: "text-xl text-gray-400",
      cardTitle: "text-2xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors",
      cardDescription: "text-gray-400 text-lg",
      gradient: "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400"
    },
  
    // Animations
    animations: {
      cardHover: "hover:border-cyan-500/50 transition-all duration-300 hover:scale-105",
      iconHover: "group-hover:scale-110 transition-transform",
      fadeIn: "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2"
    }
  };
  
  // Helper functions for easy theme access
  export const getColorClasses = (color, type = 'primary') => {
    return theme.colors[type][color] || theme.colors.primary.cyan;
  };
  
  export const getStatusClass = (status) => {
    return theme.components.status[status] || theme.components.status.active;
  };
  
  export const getButtonClass = (variant = 'primary') => {
    return theme.components.button[variant];
  };