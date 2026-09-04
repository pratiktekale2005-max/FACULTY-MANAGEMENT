import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function VerifyOTP({ email, setStep, onLoginSuccess }) {
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    // Timer state for resending OTP
    const [resendTimer, setResendTimer] = useState(30);

    useEffect(() => {
        const cachedOtp = sessionStorage.getItem("dev_otp");
        if (cachedOtp) {
            setOtp(cachedOtp);
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleVerify = async (e) => {
        if (e) e.preventDefault();
        if (!otp) {
            setError("Verification OTP is required ❌");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data = await api.post("/auth/verify-otp", { email: email.trim(), otp: otp.trim() }, false);
            sessionStorage.removeItem("dev_otp");
            onLoginSuccess(data.user, data.accessToken, data.refreshToken);
        } catch (err) {
            console.error(err);
            setError(err.message || "Server connection failure. Ensure the server is online 🔌");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendTimer > 0) return;
        
        setLoading(true);
        setError("");
        setResendTimer(30);

        try {
            const data = await api.post("/auth/send-otp", { email }, false);
            if (data.devOtp) {
                sessionStorage.setItem("dev_otp", data.devOtp);
            }
            alert("Verification OTP resent to your registered mailbox! 📧");
        } catch (err) {
            setError(err.message || "Failed to trigger OTP resend 🔌");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
            <div className="max-w-md w-full space-y-8 bg-slate-900/60 backdrop-blur-md p-8 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600"></div>

                <div className="text-center">
                    <span className="text-4xl">🔐</span>
                    <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-100">
                        Enter Security Code
                    </h2>
                    <p className="mt-2 text-xs text-slate-400">
                        A 6-digit verification code has been dispatched to:<br />
                        <strong className="text-slate-300">{email}</strong>
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleVerify}>
                    <div className="rounded-md shadow-sm space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Security OTP Code
                        </label>
                        <input
                            type="text"
                            required
                            maxLength={6}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-lg font-mono font-bold text-slate-200 placeholder-slate-800 tracking-widest focus:outline-none focus:border-indigo-500 transition-colors"
                            placeholder="000000"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-[11px] leading-relaxed">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent text-xs font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none transition-all shadow-lg hover:shadow-indigo-500/20"
                        >
                            {loading ? "Verifying..." : "Verify Code & Access System"}
                        </button>

                        <div className="flex items-center justify-between text-xs pt-2">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-slate-400 hover:text-slate-200"
                            >
                                ← Edit Email
                            </button>

                            {resendTimer > 0 ? (
                                <span className="text-slate-500">
                                    Resend code in {resendTimer}s
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    className="text-indigo-400 hover:text-indigo-300 font-semibold"
                                >
                                    Resend Code
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default VerifyOTP;