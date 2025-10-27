let cachedConfig: { apiRoot: string } | null = null;

export const getConfig = async () => {
  if (cachedConfig) return cachedConfig;
  
  try {
    const response = await fetch('./config.json');
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
