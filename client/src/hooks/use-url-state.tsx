import { useLocation } from "wouter";
import { useCallback, useMemo } from "react";

export function useUrlState() {
  const [location, setLocation] = useLocation();

  const searchParams = useMemo(() => {
    const url = new URL(window.location.href);
    return new URLSearchParams(url.search);
  }, [location]);

  const getParam = useCallback((key: string, defaultValue?: string): string => {
    return searchParams.get(key) || defaultValue || "";
  }, [searchParams]);

  const getNumberParam = useCallback((key: string, defaultValue: number = 1): number => {
    const value = searchParams.get(key);
    const parsed = value ? parseInt(value, 10) : defaultValue;
    return isNaN(parsed) ? defaultValue : parsed;
  }, [searchParams]);

  const setParam = useCallback((key: string, value: string | number) => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    
    if (value === "" || value === 0) {
      params.delete(key);
    } else {
      params.set(key, value.toString());
    }
    
    const newUrl = `${url.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    setLocation(newUrl);
  }, [setLocation]);

  const setMultipleParams = useCallback((updates: Record<string, string | number>) => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === "" || value === 0) {
        params.delete(key);
      } else {
        params.set(key, value.toString());
      }
    });
    
    const newUrl = `${url.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    setLocation(newUrl);
  }, [setLocation]);

  const clearParams = useCallback(() => {
    const url = new URL(window.location.href);
    setLocation(url.pathname);
  }, [setLocation]);

  return {
    getParam,
    getNumberParam,
    setParam,
    setMultipleParams,
    clearParams,
    searchParams,
  };
}