// FILE: src/services/authService.ts
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'customer';
  created_at?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
}

/**
 * Login with username and password
 */
export const login = async (username: string, password: string): Promise<AuthResponse> => {
  try {
    if (!username || !password) {
      return { success: false, message: 'Username dan password harus diisi' };
    }

    // Query user from database
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase())
      .eq('password', password)
      .single();

    if (error || !data) {
      return { success: false, message: 'Username atau password salah' };
    }

    const user: User = {
      id: data.id,
      username: data.username,
      name: data.name,
      role: data.role,
      created_at: data.created_at
    };

    return { success: true, user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'Terjadi kesalahan saat login' };
  }
};

/**
 * Login as guest (customer)
 */
export const loginAsGuest = async (name: string): Promise<AuthResponse> => {
  try {
    if (!name || name.trim() === '') {
      return { success: false, message: 'Nama harus diisi' };
    }

    // Create a temporary guest user
    const guestUser: User = {
      id: `guest-${Date.now()}`,
      username: name.toLowerCase().replace(/\s+/g, '-'),
      name: name.trim(),
      role: 'customer'
    };

    return { success: true, user: guestUser };
  } catch (error) {
    console.error('Guest login error:', error);
    return { success: false, message: 'Terjadi kesalahan saat login' };
  }
};

/**
 * Get user by username
 */
export const getUserByUsername = async (username: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase())
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      username: data.username,
      name: data.name,
      role: data.role,
      created_at: data.created_at
    };
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
};

/**
 * Check if user exists
 */
export const userExists = async (username: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    return !error && data !== null;
  } catch (error) {
    console.error('User exists check error:', error);
    return false;
  }
};

/**
 * Create default admin user if not exists
 */
export const ensureDefaultAdmin = async (): Promise<boolean> => {
  try {
    // Check if admin already exists
    const adminExists = await userExists('ava');
    
    if (!adminExists) {
      // Create default admin user
      const { error } = await supabase
        .from('users')
        .insert([{
          username: 'ava',
          password: '9193',
          name: 'Admin Ava',
          role: 'admin'
        }]);

      if (error) {
        console.error('Failed to create default admin:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Ensure default admin error:', error);
    return false;
  }
};
