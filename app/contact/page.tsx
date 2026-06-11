"use client";

import { useState, useEffect } from "react";
import { SecureTextInput, SecureTextarea } from "@/components/ui/SecureInput";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import { useRateLimit } from "@/hooks/useRateLimit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 200;
const MESSAGE_MAX_LENGTH = 500;

export default function ContactPage() {
  const [isClient, setIsClient] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [nameValid, setNameValid] = useState(true);
  const [messageValid, setMessageValid] = useState(true);

  const rateLimit = useRateLimit({
    maxRequests: 3,
    windowMs: 60000,
    key: "contact-form",
    storageType: "localStorage",
  });

  const isEmailFormatValid = email.trim() === "" || EMAIL_REGEX.test(email.trim());
  const isNameOverLimit = name.length > NAME_MAX_LENGTH;
  const isEmailOverLimit = email.length > EMAIL_MAX_LENGTH;
  const isMessageOverLimit = message.length > MESSAGE_MAX_LENGTH;

  const isFormDisabled =
    loading ||
    rateLimit.isRateLimited ||
    isNameOverLimit ||
    isEmailOverLimit ||
    isMessageOverLimit ||
    !nameValid ||
    !messageValid ||
    (emailTouched && !isEmailFormatValid);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <ContactSkeleton />;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Honeypot check
    if (honeypot) return;

    // Rate limit check
    if (!rateLimit.attempt()) {
      setError(
        `Too many submissions. Please wait ${rateLimit.getFormattedTime()} before trying again.`
      );
      return;
    }

    // Basic validation
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill out all fields.");
      return;
    }

    setLoading(true);

    try {
      const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL;
      if (!scriptUrl) {
        throw new Error("Contact form is not configured");
      }

      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });

      setShowSuccess(true);
      setName("");
      setEmail("");
      setMessage("");
      setEmailTouched(false);
      setNameValid(true);
      setMessageValid(true);
    } catch (err: any) {
      setError(err.message || "Error sending message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-app-charcoal">Contact Us</h1>
        <p className="text-app-gray mt-1">
          Found a bug, have feedback, or just want to say hi? We&apos;d love to
          hear from you.
        </p>
      </div>

      {/* Form card */}
      <div className="card p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <SecureTextInput
            value={name}
            onChange={setName}
            onValidationChange={setNameValid}
            label="Name"
            placeholder="Your name"
            required
            maxLength={NAME_MAX_LENGTH}
            showCharCount={false}
          />

          <div>
            <SecureTextInput
              value={email}
              onChange={(val) => {
                setEmail(val);
                if (!emailTouched && val.trim().length > 0) setEmailTouched(true);
              }}
              label="Email"
              placeholder="you@example.com"
              type="email"
              required
              maxLength={EMAIL_MAX_LENGTH}
              showCharCount={false}
            />
            {emailTouched && !isEmailFormatValid && (
              <p className="mt-1 text-xs text-amber-600">
                Please enter a valid email address (e.g. name@example.com)
              </p>
            )}
          </div>

          <SecureTextarea
            value={message}
            onChange={setMessage}
            onValidationChange={setMessageValid}
            label="Message"
            placeholder="Describe what happened, what you expected, or any feedback you have..."
            required
            rows={5}
            showCharCount
          />

          {/* Honeypot — hidden from real users */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name="honeypot"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-app-red">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isFormDisabled}
            className="btn-primary"
          >
            {rateLimit.isRateLimited
              ? `Wait ${rateLimit.getFormattedTime()}`
              : "Send Message"}
          </button>
        </form>
      </div>

      {/* Sending overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-app-charcoal/60 backdrop-blur-sm" />

          <div className="relative bg-app-white rounded-2xl shadow-xl p-8 max-w-sm mx-4">
            <div className="text-center">
              <AnimatedLogo size="md" className="mb-4" spinning />

              <h2 className="text-xl font-bold text-app-charcoal mb-2">
                Sending Message
              </h2>
              <p className="text-sm text-app-gray">
                Delivering your message, just a moment...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success modal */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Message Sent!"
        description="Thank you for reaching out. We'll review your message shortly."
        buttonText="Done"
      />
    </div>
  );
}

function ContactSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-40 bg-app-border rounded animate-pulse" />
        <div className="h-4 w-72 bg-app-border rounded animate-pulse mt-2" />
      </div>
      <div className="card p-6 max-w-2xl space-y-5">
        <div className="h-10 w-full bg-app-border rounded-lg animate-pulse" />
        <div className="h-10 w-full bg-app-border rounded-lg animate-pulse" />
        <div className="h-28 w-full bg-app-border rounded-lg animate-pulse" />
        <div className="h-12 w-36 bg-app-border rounded-app animate-pulse" />
      </div>
    </div>
  );
}
