import React, { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";

function App() {
  const [step, setStep] = useState(() => {
    try {
      const savedUser = localStorage.getItem("crm_user");
      const token = localStorage.getItem("accessToken");
      return savedUser && token ? 3 : 1;
    } catch {
      return 1;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("crm_user");
      const token = localStorage.getItem("accessToken");
      return savedUser && token ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  // Sync theme with document element and body
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light-theme");
      document.body.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("light-theme");
      document.body.classList.remove("light-theme");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  const handleLoginSuccess = (userData, accessToken, refreshToken) => {
    localStorage.setItem("crm_user", JSON.stringify(userData));
    if (accessToken) localStorage.setItem("accessToken", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    setUser(userData);
    setStep(3);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("crm_user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    // Reset branding styles to defaults
    document.documentElement.style.setProperty('--accent-purple', '#8b5cf6');
    document.documentElement.style.setProperty('--accent-blue', '#3b82f6');
    setStep(1);
  };

  // Listen to session expiration events from API client
  useEffect(() => {
    const handleLogoutEvent = () => {
      handleLogout();
    };
    window.addEventListener("crm_logout", handleLogoutEvent);
    return () => window.removeEventListener("crm_logout", handleLogoutEvent);
  }, []);

  return (
    <div className="App min-h-screen">
      {step === 1 && (
        <Login
          setStep={setStep}
          onLoginSuccess={handleLoginSuccess}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {step === 3 && user && (
        <Dashboard
          currentUser={user}
          onLogout={handleLogout}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {step === 4 && (
        <Onboarding
          setStep={setStep}
          onLoginSuccess={handleLoginSuccess}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}
    </div>
  );
}

export default App;