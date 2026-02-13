// src/app/login/page.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { mergeLocalAndServerCart } from "../../utils/cartSync";
import { mergeLocalAndServerWishlist } from "../../utils/wishlistSync";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasRedirectedRef = useRef(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  // Redirect when authenticated (Google OAuth or after credentials login)
  useEffect(() => {
    if (status === "authenticated" && session && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      toast.success("Logged in successfully!");
      router.push("/account");
    }
  }, [status, session, router]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      await signIn("google", {
        callbackUrl: "/account",
        redirect: true,
      });
    } catch (error) {
      setError("Failed to sign in with Google");
      setLoading(false);
      hasRedirectedRef.current = false;
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Register via our API route
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      toast.success("Account created! Logging in...");
      // Auto-login after registration
      await handleLogin(e, true);
    } catch (err) {
      console.error("Signup error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleLogin = async (e, isAutoLogin = false) => {
    if (!isAutoLogin) e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      // Store email for cart sync fallback
      localStorage.setItem("customer_email", formData.email);

      // Sync cart and wishlist in background
      toast.loading("Syncing your data...");

      try {
        await mergeLocalAndServerCart(formData.email);
        await mergeLocalAndServerWishlist(formData.email);
        window.dispatchEvent(new Event("cartUpdated"));
        window.dispatchEvent(new Event("wishlistUpdated"));
        toast.dismiss();
        toast.success("Logged in successfully!");
      } catch (syncError) {
        console.error("Sync error:", syncError);
        toast.dismiss();
        toast.success("Logged in successfully!");
      }

      setTimeout(() => {
        router.push("/account");
      }, 500);
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen mt-10 flex items-center justify-center bg-[#0a1833] overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/new.jpg"
          alt="Background"
          fill
          className="object-cover opacity-40 animate-heroZoomOut"
          priority
        />
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      <div className="relative z-10 max-w-md w-full bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-10 m-6 text-[#0a1833]">
        <h2 className="text-center text-4xl font-serif font-semibold mb-2">
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>
        <p className="text-center text-gray-600 mb-8">
          {isLogin
            ? "Sign in to access your Orion Diamonds account"
            : "Join Orion Diamonds – brilliance redefined"}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50 mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? "Signing in..." : "Continue with Google"}
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 text-gray-500 bg-white/90">
              Or continue with email
            </span>
          </div>
        </div>

        <form
          className="space-y-5"
          onSubmit={isLogin ? handleLogin : handleSignup}
        >
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#0a1833] focus:border-[#0a1833] text-sm bg-white/90"
              />
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#0a1833] focus:border-[#0a1833] text-sm bg-white/90"
              />
            </div>
          )}

          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#0a1833] focus:border-[#0a1833] text-sm bg-white/90"
          />

          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#0a1833] focus:border-[#0a1833] text-sm bg-white/90"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0a1833] text-white py-2.5 rounded-lg font-medium hover:bg-[#142850] transition disabled:opacity-50"
          >
            {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-[#0a1833] font-medium hover:underline"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes heroZoomOut {
          0% {
            transform: scale(1.4);
          }
          100% {
            transform: scale(1);
          }
        }
        .animate-heroZoomOut {
          animation: heroZoomOut 1.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
