// Utility functions for mapping between display labels and API codes for issue types

// Map API codes to display labels
export const getIssueTypeLabel = (apiCode: string): string => {
  const mapping: Record<string, string> = {
    'BR': 'Problem',
    'FR': 'New Work',
    'SR': 'Support',
    'MG': 'Meeting',
    // Support legacy values
    'Bug': 'Problem',
    'Feature Request': 'New Work',
    'Support': 'Support',
    'Meeting': 'Meeting',
  };
  return mapping[apiCode] || apiCode;
};

// Map display labels to API codes (not used directly, but kept for reference)
export const getIssueTypeCode = (label: string): string => {
  const mapping: Record<string, string> = {
    'Problem': 'BR',
    'New Work': 'FR',
    'Support': 'SR',
    'Meeting': 'MG',
  };
  return mapping[label] || label;
};
