
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

// User type definition
export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
}

// Auth context type definition
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Get API URL from environment or use a fallback for deployed environments
  const apiUrl = import.meta.env.VITE_API_URL || 
                 (window.location.hostname === 'localhost' ? 
                 'http://localhost:5000/api' : 
                 'https://chat-app-backend.onrender.com/api');  // Replace with your actual deployed backend URL

  // Axios instance with proper configuration
  const api = axios.create({
    baseURL: apiUrl,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    }
  });

  // Log request configuration for debugging
  api.interceptors.request.use(config => {
    console.log('Request configuration:', config);
    return config;
  }, error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  });

  // Log response for debugging
  api.interceptors.response.use(response => {
    console.log('Response:', response);
    return response;
  }, error => {
    console.error('Response error:', error);
    return Promise.reject(error);
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = localStorage.getItem('chat_token');
        
        if (storedToken) {
          setToken(storedToken);
          
          // Validate token and get user data
          const response = await api.get('/users/profile', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          
          if (response.data) {
            setUser(response.data);
            localStorage.setItem('chat_user', JSON.stringify(response.data));
          }
        }
      } catch (error) {
        console.error('Authentication error:', error);
        localStorage.removeItem('chat_user');
        localStorage.removeItem('chat_token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [apiUrl]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log(`Attempting login to ${apiUrl}/auth/login`);
      const response = await api.post('/auth/login', {
        email,
        password
      });
      
      setUser(response.data.user);
      setToken(response.data.token);
      
      localStorage.setItem('chat_user', JSON.stringify(response.data.user));
      localStorage.setItem('chat_token', response.data.token);
      
      toast({
        title: "Logged in successfully",
        description: `Welcome back, ${response.data.user.name}!`,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = "An error occurred during login";
      
      // Check for network error
      if (error.message && error.message.includes('Network Error')) {
        errorMessage = "Cannot connect to the server. Please check if the backend server is running.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid login credentials. Please check your email and password.";
      }
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      setLoading(true);
      console.log(`Attempting signup to ${apiUrl}/auth/register with:`, { name, email });
      
      // Ensure we're sending the exact format expected by the backend
      const userData = {
        name,
        email,
        password
      };
      
      console.log('Sending registration data:', userData);
      
      const response = await api.post('/auth/register', userData);
      
      console.log('Registration response:', response.data);
      
      setUser(response.data.user);
      setToken(response.data.token);
      
      localStorage.setItem('chat_user', JSON.stringify(response.data.user));
      localStorage.setItem('chat_token', response.data.token);
      
      toast({
        title: "Account created successfully",
        description: `Welcome, ${response.data.user.name}!`,
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMessage = "An error occurred during registration";
      
      // Check for specific error types
      if (error.message && error.message.includes('Network Error')) {
        errorMessage = "Cannot connect to the server. Please check if the backend server is running.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid registration data. Email may already be in use.";
      }
      
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint if token exists
      if (token) {
        await api.post(
          '/auth/logout',
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local data regardless of API success
      setUser(null);
      setToken(null);
      localStorage.removeItem('chat_user');
      localStorage.removeItem('chat_token');
      toast({
        title: "Logged out",
        description: "You've been successfully logged out",
      });
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('chat_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !!token,
        loading,
        token,
        login,
        signup,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
