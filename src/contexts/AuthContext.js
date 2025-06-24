'use client';
import { createContext, useContext, useReducer, useEffect } from 'react';

// Auth states
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        error: null
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        accessToken: null,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        accessToken: null,
        loading: false,
        error: null
      };
    case 'TOKEN_REFRESH':
      return {
        ...state,
        accessToken: action.payload.accessToken,
        user: action.payload.user,
        isAuthenticated: true
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

const initialState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  loading: true,
  error: null
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // API call helper with token
  const apiCall = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (state.accessToken) {
      headers.Authorization = `Bearer ${state.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle token expiration
    if (response.status === 401 && state.isAuthenticated) {
      const refreshResult = await refreshToken();
      if (refreshResult.success) {
        // Retry the original request with new token
        headers.Authorization = `Bearer ${refreshResult.accessToken}`;
        return fetch(url, { ...options, headers });
      } else {
        // Refresh failed, logout user
        logout();
        throw new Error('Session expired');
      }
    }

    return response;
  };

  // Login function
  const login = async (username, password, rememberMe = false) => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, rememberMe })
      });

      const data = await response.json();

      if (data.success) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: data.user,
            accessToken: data.accessToken
          }
        });
        
        // Store token in localStorage for persistence
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        return { success: true, user: data.user };
      } else {
        dispatch({
          type: 'LOGIN_FAILURE',
          payload: data.error
        });
        return { success: false, error: data.error, code: data.code };
      }
    } catch (error) {
      const errorMessage = 'Network error. Please check your connection.';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout API error:', error);
    }

    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    
    dispatch({ type: 'LOGOUT' });
  };

  // Refresh token function
  const refreshToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        dispatch({
          type: 'TOKEN_REFRESH',
          payload: {
            accessToken: data.accessToken,
            user: data.user
          }
        });
        
        // Update localStorage
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        return { success: true, accessToken: data.accessToken };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Token refresh failed' };
    }
  };

  // Register function (only for first user)
  const register = async (userData) => {
    try {
      const response = await apiCall('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: 'Registration failed' };
    }
  };

  // Initialize system function
  const initializeSystem = async () => {
    try {
      const response = await fetch('/api/auth/init', {
        method: 'POST'
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: 'System initialization failed' };
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          // Verify token is still valid
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: {
                user: data.user,
                accessToken: storedToken
              }
            });
          } else {
            // Token invalid, try to refresh
            const refreshResult = await refreshToken();
            if (!refreshResult.success) {
              // Refresh failed, clear stored data
              localStorage.removeItem('accessToken');
              localStorage.removeItem('user');
              dispatch({ type: 'LOGOUT' });
            }
          }
        } catch (error) {
          // Error validating token
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (state.isAuthenticated && state.accessToken) {
      // Refresh token every 50 minutes (JWT expires in 1 hour)
      const refreshInterval = setInterval(() => {
        refreshToken();
      }, 50 * 60 * 1000);

      return () => clearInterval(refreshInterval);
    }
  }, [state.isAuthenticated, state.accessToken]);

  const value = {
    ...state,
    login,
    logout,
    register,
    initializeSystem,
    refreshToken,
    clearError,
    apiCall
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// HOC for protected routes
export const withAuth = (WrappedComponent) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <span className="text-white text-lg">Loading...</span>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null; // Will be handled by the main App routing
    }

    return <WrappedComponent {...props} />;
  };
};