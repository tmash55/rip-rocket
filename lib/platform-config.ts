// Platform configuration for consistent colors and information across components

export const PLATFORM_COLORS: Record<string, string> = {
  'ESPN': '#de0000',
  'Yahoo': '#6002D2', 
  'Sleeper': '#15273A',
  'NFC': '#23A0A0',
  'Consensus': '#F97316',
};

export const PLATFORM_INFO = {
  nfc: { 
    label: "NFC", 
    description: "NFC Rankings", 
    color: PLATFORM_COLORS['NFC'],
    slug: 'nfc'
  },
  consensus: { 
    label: "Consensus", 
    description: "Average across all platforms", 
    color: PLATFORM_COLORS['Consensus'],
    slug: 'consensus'
  },
  sleeper: { 
    label: "Sleeper", 
    description: "Sleeper App Rankings", 
    color: PLATFORM_COLORS['Sleeper'],
    slug: 'sleeper'
  },
  espn: { 
    label: "ESPN", 
    description: "ESPN Fantasy Rankings", 
    color: PLATFORM_COLORS['ESPN'],
    slug: 'espn'
  },
  yahoo: { 
    label: "Yahoo", 
    description: "Yahoo Fantasy Rankings", 
    color: PLATFORM_COLORS['Yahoo'],
    slug: 'yahoo'
  },
};

// Utility function to get platform color
export const getPlatformColor = (platform: string): string => {
  return PLATFORM_COLORS[platform] || '#6b7280';
};

// Utility function to get platform info
export const getPlatformInfo = (platformSlug: string) => {
  return PLATFORM_INFO[platformSlug as keyof typeof PLATFORM_INFO] || {
    label: platformSlug,
    description: `${platformSlug} Rankings`,
    color: '#6b7280',
    slug: platformSlug
  };
};