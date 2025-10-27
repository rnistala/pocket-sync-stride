let cachedConfig: { apiRoot: string } | null = null;

export const getConfig = async () => {
  if (cachedConfig) return cachedConfig;
  
  try {
    // Use an absolute path relative to the current page location
    const baseUrl = window.location.pathname.endsWith('/') 
      ? window.location.pathname 
      : window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
    const response = await fetch(`${baseUrl}config.json`);
    cachedConfig = await response.json();
    return cachedConfig;
  } catch (error) {
    console.error('Failed to load config.json, using default:', error);
    return { apiRoot: 'https://demo.opterix.in' };
  }
};

export const getApiRoot = async () => {
  const config = await getConfig();
  return config.apiRoot;
};
