"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ContactRound,
  Loader2,
  MapPin,
  Phone,
  PhoneCall,
  PhoneOff,
  Trash2,
  UserPlus,
} from "lucide-react";

import Sidebar from "../components/Sidebar";

const phoneNumberPattern = /^\+[1-9]\d{7,14}$/;

export default function CallsPage() {
  const deviceRef = useRef(null);
  const activeCallRef = useRef(null);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCallLoading, setPhoneCallLoading] = useState(false);
  const [phoneCallError, setPhoneCallError] = useState("");
  const [phoneCallStatus, setPhoneCallStatus] = useState("");
  const [activeCallNumber, setActiveCallNumber] = useState("");
  const [callInProgress, setCallInProgress] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Ready");
  const [recordCall, setRecordCall] = useState(false);
  const [phoneLookup, setPhoneLookup] = useState(null);
  const [phoneLookupLoading, setPhoneLookupLoading] = useState(false);
  const [phoneLookupError, setPhoneLookupError] = useState("");
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactSaving, setContactSaving] = useState(false);
  const [contactDeletingId, setContactDeletingId] = useState("");
  const [contactError, setContactError] = useState("");
  const [contactStatus, setContactStatus] = useState("");

  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );
  }, [contacts]);

  useEffect(() => {
    async function fetchContacts() {
      try {
        setContactsLoading(true);
        const response = await fetch("/api/phone-contacts", {
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load contacts.");
        }

        setContacts(Array.isArray(data?.contacts) ? data.contacts : []);
      } catch (error) {
        setContactError(error.message || "Failed to load contacts.");
      } finally {
        setContactsLoading(false);
      }
    }

    fetchContacts();
  }, []);

  useEffect(() => {
    return () => {
      activeCallRef.current?.disconnect?.();
      deviceRef.current?.destroy?.();
    };
  }, []);

  async function fetchVoiceToken() {
    const response = await fetch("/api/twilio-token", {
      method: "POST",
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.message || "Failed to prepare browser calling.");
    }

    return data.token;
  }

  async function getVoiceDevice() {
    if (deviceRef.current) return deviceRef.current;

    setVoiceStatus("Starting browser audio...");

    const token = await fetchVoiceToken();
    const { Device } = await import("@twilio/voice-sdk");
    const device = new Device(token, {
      logLevel: 1,
      tokenRefreshMs: 60000,
    });

    device.on("registered", () => setVoiceStatus("Ready"));
    device.on("registering", () => setVoiceStatus("Connecting audio..."));
    device.on("unregistered", () => setVoiceStatus("Audio offline"));
    device.on("error", (error) => {
      setPhoneCallError(error?.message || "Browser calling failed.");
      setVoiceStatus("Audio error");
    });
    device.on("tokenWillExpire", async () => {
      try {
        device.updateToken(await fetchVoiceToken());
      } catch (error) {
        setPhoneCallError(error.message || "Failed to refresh voice token.");
      }
    });

    deviceRef.current = device;
    setVoiceStatus("Ready");
    return device;
  }

  function resetActiveCall(nextStatus = "Call ended.") {
    activeCallRef.current = null;
    setCallInProgress(false);
    setPhoneCallLoading(false);
    setActiveCallNumber("");
    setVoiceStatus("Ready");
    setPhoneCallStatus(nextStatus);
  }

  function attachCallEvents(call) {
    activeCallRef.current = call;

    call.on("accept", () => {
      setCallInProgress(true);
      setVoiceStatus("Connected");
      setPhoneCallStatus(
        recordCall
          ? "Call connected. Recording is on."
          : "Call connected. Browser audio is on."
      );
    });

    call.on("disconnect", () => resetActiveCall());
    call.on("cancel", () => resetActiveCall("Call canceled."));
    call.on("reject", () => resetActiveCall("Call rejected."));
    call.on("error", (error) => {
      setPhoneCallError(error?.message || "Call failed.");
      resetActiveCall("Call ended.");
    });
  }

  async function lookupPhoneNumber(value = "") {
    const phone = String(value).trim();

    if (!phoneNumberPattern.test(phone)) {
      setPhoneLookup(null);
      setPhoneLookupError("");
      return;
    }

    try {
      setPhoneLookupLoading(true);
      setPhoneLookupError("");

      const response = await fetch(
        `/api/phone-lookup?phone=${encodeURIComponent(phone)}`,
        { cache: "no-store" }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to look up phone number.");
      }

      setPhoneLookup(data);
    } catch (error) {
      setPhoneLookup(null);
      setPhoneLookupError(error.message || "Failed to look up phone number.");
    } finally {
      setPhoneLookupLoading(false);
    }
  }

  async function callPhoneNumber(value = "") {
    if (phoneCallLoading || callInProgress) return;

    const to = String(value).trim();
    setPhoneCallError("");
    setPhoneCallStatus("");

    if (!to) {
      setPhoneCallError("Enter a phone number.");
      return;
    }

    if (!phoneNumberPattern.test(to)) {
      setPhoneCallError("Use international format, like +201011396246.");
      return;
    }

    try {
      setPhoneCallLoading(true);
      setActiveCallNumber(to);
      setVoiceStatus("Calling...");
      lookupPhoneNumber(to);

      const device = await getVoiceDevice();
      const call = await device.connect({
        params: {
          To: to,
          Record: recordCall ? "true" : "false",
        },
      });

      setCallInProgress(true);
      attachCallEvents(call);
      setPhoneCallStatus(
        recordCall
          ? "Call started. Recording requested."
          : "Call started. Use your browser microphone and speakers."
      );
    } catch (error) {
      setPhoneCallError(error.message || "Failed to start phone call.");
      setVoiceStatus("Ready");
      setCallInProgress(false);
      setActiveCallNumber("");
    } finally {
      setPhoneCallLoading(false);
    }
  }

  async function startPhoneCall(event) {
    event.preventDefault();
    await callPhoneNumber(phoneNumber);
  }

  function endPhoneCall() {
    activeCallRef.current?.disconnect?.();
    deviceRef.current?.disconnectAll?.();
    resetActiveCall();
  }

  async function saveContact(event) {
    event.preventDefault();

    const name = contactName.trim();
    const phone = contactPhone.trim();
    setContactError("");
    setContactStatus("");

    if (!name || !phone) {
      setContactError("Enter contact name and phone number.");
      return;
    }

    if (!phoneNumberPattern.test(phone)) {
      setContactError("Use international format, like +201011396246.");
      return;
    }

    try {
      setContactSaving(true);

      const response = await fetch("/api/phone-contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, phone }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to save contact.");
      }

      setContacts((currentContacts) => {
        const withoutDuplicate = currentContacts.filter(
          (contact) =>
            contact._id !== data.contact?._id &&
            contact.phone !== data.contact?.phone
        );
        return data.contact
          ? [...withoutDuplicate, data.contact]
          : currentContacts;
      });
      setContactName("");
      setContactPhone("");
      setContactStatus("Contact saved.");
    } catch (error) {
      setContactError(error.message || "Failed to save contact.");
    } finally {
      setContactSaving(false);
    }
  }

  async function deleteContact(id) {
    setContactError("");
    setContactStatus("");

    try {
      setContactDeletingId(id);

      const response = await fetch("/api/phone-contacts", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to delete contact.");
      }

      setContacts((currentContacts) =>
        currentContacts.filter((contact) => contact._id !== id)
      );
      setContactStatus("Contact deleted.");
    } catch (error) {
      setContactError(error.message || "Failed to delete contact.");
    } finally {
      setContactDeletingId("");
    }
  }

  return (
    <div className="app-shell grid min-h-screen grid-cols-1 pb-14 text-white lg:grid-cols-[4.5rem_1fr] lg:pb-0">
      <Sidebar />

      <main className="relative min-h-[calc(100svh_-_4rem)] px-4 py-5 sm:px-6 lg:min-h-screen lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <section className="app-panel rounded-[1.75rem] border border-white/10 p-5 shadow-2xl shadow-black/20 sm:p-7">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-100">
                <PhoneCall className="h-7 w-7" />
              </div>

              <div className="min-w-0">
                <div className="app-kicker">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-300/15 text-emerald-200">
                    <Phone className="h-4 w-4" />
                  </span>
                  Phone Call
                </div>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Calls
                </h1>
              </div>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
            <section className="app-panel rounded-[1.75rem] border border-white/10 p-5 sm:p-7">
              <form onSubmit={startPhoneCall} className="space-y-4">
                <label
                  htmlFor="phone-number"
                  className="block text-sm font-bold text-slate-200"
                >
                  Phone number
                </label>

                <div className="app-input flex min-h-14 items-center gap-3 rounded-2xl px-4">
                  <Phone className="h-5 w-5 shrink-0 text-slate-400" />
                  <input
                    id="phone-number"
                    value={phoneNumber}
                    onChange={(event) => {
                      setPhoneNumber(event.target.value);
                      setPhoneCallError("");
                      setPhoneCallStatus("");
                      setPhoneLookupError("");
                    }}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+201011396246"
                    className="min-w-0 flex-1 bg-transparent text-base font-semibold text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>

                <label className="app-input flex min-h-12 items-center gap-3 rounded-2xl px-4">
                  <input
                    checked={recordCall}
                    onChange={(event) => setRecordCall(event.target.checked)}
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-400"
                  />
                  <span className="text-sm font-bold text-slate-200">
                    Record call
                  </span>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="submit"
                    disabled={phoneCallLoading || callInProgress}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                  >
                    {phoneCallLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <PhoneCall className="h-5 w-5" />
                    )}
                    <span>
                      {phoneCallLoading ? "Calling..." : "Start Browser Call"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={endPhoneCall}
                    disabled={!callInProgress && !phoneCallLoading}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-3 font-black text-red-100 transition hover:-translate-y-0.5 hover:bg-red-400/15 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
                  >
                    <PhoneOff className="h-5 w-5" />
                    <span>End Call</span>
                  </button>
                </div>
              </form>

              {(phoneCallError || phoneCallStatus) && (
                <div
                  className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                    phoneCallError
                      ? "border-red-400/20 bg-red-400/10 text-red-100"
                      : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                  }`}
                  aria-live="polite"
                >
                  {phoneCallError ? (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-200" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                  )}
                  <span>{phoneCallError || phoneCallStatus}</span>
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
                      Call Status
                    </p>
                    <p className="mt-1 truncate text-sm font-bold text-white">
                      {voiceStatus}
                    </p>
                  </div>
                  {phoneCallLoading || callInProgress ? (
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-emerald-200" />
                  ) : (
                    <PhoneCall className="h-5 w-5 shrink-0 text-slate-400" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => lookupPhoneNumber(phoneNumber)}
                  disabled={phoneLookupLoading || !phoneNumber.trim()}
                  className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {phoneLookupLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                  <span>Check Number Location</span>
                </button>

                {(phoneLookup || phoneLookupError) && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                    {phoneLookupError ? (
                      <p className="text-sm text-red-100">{phoneLookupError}</p>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-emerald-100">
                          <MapPin className="h-4 w-4" />
                          <span className="font-black">
                            {phoneLookup.locationLabel || "Unknown location"}
                          </span>
                        </div>
                        <dl className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                          <div>
                            <dt className="font-black uppercase text-slate-500">
                              National
                            </dt>
                            <dd>{phoneLookup.nationalFormat || "Unknown"}</dd>
                          </div>
                          <div>
                            <dt className="font-black uppercase text-slate-500">
                              Carrier
                            </dt>
                            <dd>{phoneLookup.carrierName || "Unknown"}</dd>
                          </div>
                          <div>
                            <dt className="font-black uppercase text-slate-500">
                              Type
                            </dt>
                            <dd>{phoneLookup.lineType || "Unknown"}</dd>
                          </div>
                          <div>
                            <dt className="font-black uppercase text-slate-500">
                              Valid
                            </dt>
                            <dd>{phoneLookup.valid ? "Yes" : "Unknown"}</dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="app-panel rounded-[1.75rem] border border-white/10 p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <div className="app-kicker">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-300/15 text-cyan-200">
                      <ContactRound className="h-4 w-4" />
                    </span>
                    Contacts
                  </div>
                  <h2 className="mt-3 text-xl font-black text-white">
                    Phone Numbers
                  </h2>
                </div>
                <UserPlus className="h-5 w-5 text-slate-400" />
              </div>

              <form onSubmit={saveContact} className="space-y-3">
                <input
                  value={contactName}
                  onChange={(event) => {
                    setContactName(event.target.value);
                    setContactError("");
                    setContactStatus("");
                  }}
                  placeholder="Contact name"
                  className="app-input min-h-12 w-full rounded-2xl px-4 text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none"
                />
                <input
                  value={contactPhone}
                  onChange={(event) => {
                    setContactPhone(event.target.value);
                    setContactError("");
                    setContactStatus("");
                  }}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+201011396246"
                  className="app-input min-h-12 w-full rounded-2xl px-4 text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={contactSaving}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 font-bold text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                >
                  {contactSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  <span>{contactSaving ? "Saving..." : "Save Contact"}</span>
                </button>
              </form>

              {(contactError || contactStatus) && (
                <div
                  className={`mt-4 flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs ${
                    contactError
                      ? "border-red-400/20 bg-red-400/10 text-red-100"
                      : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                  }`}
                  aria-live="polite"
                >
                  {contactError ? (
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-200" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-200" />
                  )}
                  <span>{contactError || contactStatus}</span>
                </div>
              )}

              <div className="mt-5 space-y-2">
                {contactsLoading ? (
                  [1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-16 animate-pulse rounded-2xl bg-white/10"
                    />
                  ))
                ) : sortedContacts.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-400">
                    No phone contacts saved.
                  </p>
                ) : (
                  sortedContacts.map((contact) => (
                    <div
                      key={contact._id}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-100">
                        <ContactRound className="h-5 w-5" />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneNumber(contact.phone);
                          callPhoneNumber(contact.phone);
                        }}
                        className="min-w-0 flex-1 text-left"
                        disabled={phoneCallLoading || callInProgress}
                      >
                        <p className="truncate text-sm font-black text-white">
                          {contact.name}
                        </p>
                        <p className="truncate text-xs font-semibold text-slate-400">
                          {contact.phone}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteContact(contact._id)}
                        disabled={contactDeletingId === contact._id}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-400/15 bg-red-400/10 text-red-100 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Delete contact"
                        aria-label={`Delete ${contact.name}`}
                      >
                        {contactDeletingId === contact._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneNumber(contact.phone);
                          callPhoneNumber(contact.phone);
                        }}
                        disabled={phoneCallLoading || callInProgress}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Call contact"
                        aria-label={`Call ${contact.name}`}
                      >
                        {phoneCallLoading && activeCallNumber === contact.phone ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <PhoneCall className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
