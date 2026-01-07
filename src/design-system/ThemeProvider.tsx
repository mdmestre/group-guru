import React from "react";

export const ThemeContext = React.createContext({
  spacing: (n: number) => `${n * 4}px`,
  radius: {
    sm: '6px',
    md: '10px',
    lg: '14px'
  }
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = {
    spacing: (n: number) => `${n * 4}px`,
    radius: { sm: '6px', md: '10px', lg: '14px' }
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export default ThemeProvider;
