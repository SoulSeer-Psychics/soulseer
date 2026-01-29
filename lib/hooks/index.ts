import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Authentication hooks
export function useCurrentUser() {
  const { user, isLoaded } = useUser();
  const [dbUser, setDbUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      if (!isLoaded) return;
      
      if (!user) {
        setDbUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/user');
        if (response.ok) {
          const userData = await response.json();
          setDbUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [user, isLoaded]);

  return {
    user: dbUser,
    clerkUser: user,
    isLoading: loading || !isLoaded,
    isAuthenticated: !!user,
  };
}

// Reading session hooks
export function useReadingSession(sessionId?: string) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/readings/${sessionId}`);
      if (response.ok) {
        const sessionData = await response.json();
        setSession(sessionData);
      } else {
        throw new Error('Failed to fetch session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const startSession = useCallback(async (readerId: string, type: 'chat' | 'voice' | 'video') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/readings/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readerId, type }),
      });
      
      if (response.ok) {
        const newSession = await response.json();
        setSession(newSession);
        return newSession;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const endSession = useCallback(async (rating?: number, review?: string) => {
    if (!session) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(`/api/readings/${session.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, review }),
      });
      
      if (response.ok) {
        const endedSession = await response.json();
        setSession(endedSession);
        return endedSession;
      } else {
        throw new Error('Failed to end session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  return {
    session,
    loading,
    error,
    startSession,
    endSession,
    refetch: fetchSession,
  };
}

// Balance and payment hooks
export function useClientBalance() {
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/balance');
      if (response.ok) {
        const balanceData = await response.json();
        setBalance(balanceData);
      } else {
        throw new Error('Failed to fetch balance');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const addFunds = useCallback(async (amount: number, paymentMethodId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/payments/add-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, paymentMethodId }),
      });
      
      if (response.ok) {
        const result = await response.json();
        await fetchBalance(); // Refresh balance
        return result;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add funds');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchBalance]);

  return {
    balance,
    loading,
    error,
    addFunds,
    refetch: fetchBalance,
  };
}

// Reader hooks
export function useReaderProfile(readerId?: string) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!readerId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/readers/${readerId}`);
      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
      } else {
        throw new Error('Failed to fetch reader profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [readerId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateStatus = useCallback(async (isOnline: boolean, isAvailable: boolean) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/readers/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline, isAvailable }),
      });
      
      if (response.ok) {
        await fetchProfile(); // Refresh profile
      } else {
        throw new Error('Failed to update status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    updateStatus,
    refetch: fetchProfile,
  };
}

// Live streaming hooks
export function useLiveStream(streamId?: string) {
  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStream = useCallback(async () => {
    if (!streamId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/streams/${streamId}`);
      if (response.ok) {
        const streamData = await response.json();
        setStream(streamData);
      } else {
        throw new Error('Failed to fetch stream');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    fetchStream();
  }, [fetchStream]);

  const startStream = useCallback(async (streamData: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/streams/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(streamData),
      });
      
      if (response.ok) {
        const newStream = await response.json();
        setStream(newStream);
        return newStream;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start stream');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const endStream = useCallback(async () => {
    if (!stream) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(`/api/streams/${stream.id}/end`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const endedStream = await response.json();
        setStream(endedStream);
        return endedStream;
      } else {
        throw new Error('Failed to end stream');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [stream]);

  return {
    stream,
    loading,
    error,
    startStream,
    endStream,
    refetch: fetchStream,
  };
}

// Generic API hook
export function useApi<T>(endpoint: string, options?: { immediate?: boolean }) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (fetchOptions?: RequestInit) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(endpoint, fetchOptions);
      if (response.ok) {
        const result = await response.json();
        setData(result);
        return result;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Request failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (options?.immediate !== false) {
      execute();
    }
  }, [execute, options?.immediate]);

  return {
    data,
    loading,
    error,
    execute,
    refetch: execute,
  };
}

// Local storage hook
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      }
      return initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}

// Debounced value hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Media query hook
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

// Previous value hook
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
}

// Intersection observer hook
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  { threshold = 0, root = null, rootMargin = '0%' }: IntersectionObserverInit = {}
): IntersectionObserverEntry | undefined {
  const [entry, setEntry] = useState<IntersectionObserverEntry>();

  useEffect(() => {
    const element = elementRef?.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      { threshold, root, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef, threshold, root, rootMargin]);

  return entry;
}

// Online status hook
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return isOnline;
}

// Copy to clipboard hook
export function useCopyToClipboard(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  }, []);

  return [copied, copy];
}

// Async operation hook with loading and error states
export function useAsyncOperation<T extends any[], R>(
  operation: (...args: T) => Promise<R>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...args: T): Promise<R | undefined> => {
    setLoading(true);
    setError(null);

    try {
      const result = await operation(...args);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [operation]);

  return {
    execute,
    loading,
    error,
    clearError: () => setError(null),
  };
}

// Form validation hook
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Record<keyof T, (value: any) => string | null>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const setFieldTouched = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const validate = useCallback(() => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(validationRules).forEach(field => {
      const fieldKey = field as keyof T;
      const error = validationRules[fieldKey](values[fieldKey]);
      if (error) {
        newErrors[fieldKey] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validationRules]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validate,
    reset,
    isValid: Object.keys(errors).length === 0,
  };
}

// Router hook with query parameters
export function useRouterQuery() {
  const router = useRouter();
  const [query, setQuery] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const queryObject: Record<string, string> = {};
      
      urlParams.forEach((value, key) => {
        queryObject[key] = value;
      });
      
      setQuery(queryObject);
    }
  }, []);

  const updateQuery = useCallback((updates: Record<string, string | null>) => {
    const newQuery = { ...query };
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        delete newQuery[key];
      } else {
        newQuery[key] = value;
      }
    });
    
    const searchParams = new URLSearchParams(newQuery);
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    
    router.push(newUrl);
    setQuery(newQuery);
  }, [query, router]);

  return { query, updateQuery };
}
