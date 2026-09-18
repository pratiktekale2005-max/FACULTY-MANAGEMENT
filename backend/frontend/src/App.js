import React, { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";

function App() {
  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData, accessToken, refreshToken) => {
    setUser(userData);
    localStorage.setItem("crm_user", JSON.stringify(userData));
    if (accessToken) localStorage.setItem("accessToken", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
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
        />
      )}

      {step === 3 && user && (
        <Dashboard
          currentUser={user}
          onLogout={handleLogout}
        />
      )}

      {step === 4 && (
        <Onboarding
          setStep={setStep}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}

export default App;