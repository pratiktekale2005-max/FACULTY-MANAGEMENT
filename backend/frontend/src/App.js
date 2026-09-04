import React, { useState, useEffect } from "react";
import Login from "./pages/Login";
import VerifyOTP from "./pages/VerifyOTP";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";

function App() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [user, setUser] = useState(null);

  // Sync session from cache
  useEffect(() => {
    const cachedUser = localStorage.getItem("crm_user");
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
        setStep(3);
      } catch (err) {
        localStorage.removeItem("crm_user");
      }
    }
  }, []);

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
          setEmail={setEmail}
        />
      )}

      {step === 2 && (
        <VerifyOTP
          email={email}
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
          setEmail={setEmail}
        />
      )}
    </div>
  );
}

export default App;