"use client";

import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth/client";

type FormState = "idle" | "verifying" | "resending" | "verified";

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "We could not verify that code. Check it and try again.";
}

export function VerifyEmailForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");
  const isBusy = formState === "verifying" || formState === "resending";

  async function verifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (code.length !== 6) {
      setMessage("Enter the 6-digit code from your verification email.");
      return;
    }

    setFormState("verifying");
    try {
      await authClient.emailOtp.verifyEmail({
        email: email.trim(),
        otp: code,
        fetchOptions: { throw: true }
      });
      setFormState("verified");
      setMessage("Your email address is verified. You can now sign in.");
    } catch (error) {
      setFormState("idle");
      setMessage(getErrorMessage(error));
    }
  }

  async function resendCode() {
    setMessage("");
    if (!email.trim()) {
      setMessage("Enter your email address before requesting a new code.");
      return;
    }

    setFormState("resending");
    try {
      await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "email-verification",
        fetchOptions: { throw: true }
      });
      setFormState("idle");
      setMessage("A new verification code was sent to your email.");
    } catch (error) {
      setFormState("idle");
      setMessage(getErrorMessage(error));
    }
  }

  return <section className="verify-card" aria-labelledby="verify-email-title">
    <div className="verify-eyebrow">Market Pulse account</div>
    <h1 id="verify-email-title">Verify your email</h1>
    <p className="verify-intro">Enter the email address you registered with and the 6-digit code Neon sent you.</p>

    {formState === "verified" ? <div className="verify-success" role="status">
      <p>{message}</p>
      <a className="verify-primary" href="/auth/sign-in">Continue to sign in</a>
    </div> : <form className="verify-form" onSubmit={verifyEmail}>
      <label htmlFor="verification-email">Email</label>
      <input
        id="verification-email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={isBusy}
      />

      <label htmlFor="verification-code">Verification code</label>
      <input
        id="verification-code"
        className="verify-code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="000000"
        maxLength={6}
        required
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
        disabled={isBusy}
      />

      {message && <p className="verify-message" role="status">{message}</p>}

      <button className="verify-primary" type="submit" disabled={isBusy}>
        {formState === "verifying" ? "Verifying…" : "Verify email"}
      </button>
      <button className="verify-secondary" type="button" onClick={resendCode} disabled={isBusy}>
        {formState === "resending" ? "Sending…" : "Send a new code"}
      </button>
    </form>}

    <a className="verify-back" href="/auth/sign-in">Back to sign in</a>
  </section>;
}
