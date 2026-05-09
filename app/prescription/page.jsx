"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileText,
  Loader2,
  Pill,
  Send,
  ShieldCheck,
  Stethoscope,
  Upload,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { cn } from "../../lib/utils";

const tabs = [
  {
    id: "extract",
    label: "Read Doses",
    icon: FileText,
  },
  {
    id: "validate",
    label: "Validate Medicines",
    icon: ShieldCheck,
  },
];

function splitMedicines(value) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function pickValue(source, keys) {
  for (const key of keys) {
    const value = source?.[key];

    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "object") return JSON.stringify(value);

    return String(value);
  }

  return "";
}

function getExtractSource(data) {
  return (
    data?.prescription?.data ||
    data?.prescription ||
    data?.data ||
    data ||
    {}
  );
}

function getMedicines(data) {
  const source = getExtractSource(data);

  if (Array.isArray(data?.medicines)) return data.medicines;
  if (Array.isArray(source?.medicines)) return source.medicines;
  if (Array.isArray(source?.medications)) return source.medications;
  if (Array.isArray(source?.prescription?.medications)) {
    return source.prescription.medications;
  }

  return [];
}

function getPatient(source) {
  if (typeof source?.patient === "object") {
    return pickValue(source.patient, ["name", "patientName", "patient_name"]);
  }

  return pickValue(source, ["patient", "patientName", "patient_name"]);
}

function getDoctor(source) {
  if (typeof source?.doctor === "object") {
    return pickValue(source.doctor, ["name", "doctorName", "doctor_name"]);
  }

  return pickValue(source, ["doctor", "doctorName", "doctor_name"]);
}

function getValidation(data) {
  return data?.validation || data?.prescription?.data || data?.data || data || {};
}

function getValidationRows(validation) {
  const medicineRows = Array.isArray(validation?.medicinesFound)
    ? validation.medicinesFound
    : [];
  const details = validation?.validations?.medicinesIncluded?.details || {};
  const found = Array.isArray(details.foundMedicines)
    ? details.foundMedicines.map((name) => ({ name, found: true }))
    : [];
  const missing = Array.isArray(details.missingMedicines)
    ? details.missingMedicines.map((name) => ({ name, found: false }))
    : [];

  return medicineRows.length ? medicineRows : [...found, ...missing];
}

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PrescriptionPage() {
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState("extract");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [patientName, setPatientName] = useState("");
  const [medicinesText, setMedicinesText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeTab = tabs.find((tab) => tab.id === mode) || tabs[0];
  const ActiveIcon = activeTab.icon;
  const medicines = useMemo(
    () => splitMedicines(medicinesText),
    [medicinesText]
  );
  const canSubmit =
    Boolean(file) &&
    !loading &&
    (mode === "extract" || (patientName.trim() && medicines.length > 0));
  const source = result?.mode === "extract" ? getExtractSource(result.data) : {};
  const extractedMedicines =
    result?.mode === "extract" ? getMedicines(result.data) : [];
  const validation = result?.mode === "validate" ? getValidation(result.data) : {};
  const validationRows =
    result?.mode === "validate" ? getValidationRows(validation) : [];
  const isValid =
    validation?.isValid ?? validation?.validations?.overall?.valid ?? null;
  const patientMatch =
    validation?.patientMatch ??
    validation?.validations?.patientName?.valid ??
    validation?.validations?.patient?.valid ??
    null;

  useEffect(() => {
    if (!file || !file.type?.startsWith("image/")) {
      setPreviewUrl("");
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [file]);

  function selectFile(nextFile) {
    if (!nextFile) return;

    const fileType = String(nextFile.type || "").toLowerCase();
    const isImage = fileType.startsWith("image/");
    const isPdf =
      fileType === "application/pdf" || /\.pdf$/i.test(nextFile.name || "");

    if (!isImage && !isPdf) {
      setError("Upload a prescription image or PDF.");
      return;
    }

    setFile(nextFile);
    setError("");
    setResult(null);
  }

  function clearFile() {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submitPrescription(event) {
    event.preventDefault();

    if (!file || loading) return;

    if (mode === "validate" && !patientName.trim()) {
      setError("Patient name is required.");
      return;
    }

    if (mode === "validate" && !medicines.length) {
      setError("Add at least one medicine to validate.");
      return;
    }

    setLoading(true);
    setError("");
    setCopied(false);

    try {
      const formData = new FormData();
      formData.append("prescription", file);

      if (mode === "validate") {
        formData.append("patientName", patientName.trim());
        medicines.forEach((medicine) => formData.append("medicines", medicine));
      }

      const response = await fetch(
        mode === "validate"
          ? "/api/prescription-validate"
          : "/api/prescription-reader",
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Prescription request failed.");
      }

      setResult({
        mode,
        data,
      });
    } catch (requestError) {
      setError(requestError.message || "Prescription request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result?.data) return;

    try {
      await navigator.clipboard.writeText(
        result.data.text ||
          JSON.stringify(result.data.prescription || result.data, null, 2)
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setError("Could not copy result.");
    }
  }

  return (
    <div className="app-shell grid min-h-screen grid-cols-1 pb-14 text-white lg:grid-cols-[4.5rem_1fr] lg:pb-0">
      <Sidebar />

      <main className="app-chat-canvas min-h-screen overflow-hidden">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="app-page-header flex-col items-start gap-4 md:flex-row md:items-end">
            <div>
              <div className="app-kicker">
                <Stethoscope className="h-4 w-4" />
                Prescription Reader
              </div>
              <h1 className="app-page-title app-gradient-text">
                Clinical Document OCR
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                Read prescription doses or validate a medicine list against an
                uploaded prescription.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">
              Verify results before medical use
            </div>
          </header>

          <section className="grid flex-1 gap-5 lg:grid-cols-[25rem_1fr]">
            <form
              onSubmit={submitPrescription}
              className="app-premium-card flex flex-col rounded-[1.75rem] p-4 sm:p-5"
            >
              <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-2 sm:grid-cols-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = tab.id === mode;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setMode(tab.id);
                        setResult(null);
                        setError("");
                      }}
                      className={cn(
                        "inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-black transition",
                        active
                          ? "bg-cyan-300 text-slate-950"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  selectFile(event.dataTransfer.files?.[0]);
                }}
                className="mt-4 flex min-h-48 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-cyan-300/30 bg-cyan-300/8 px-4 py-6 text-center transition hover:border-cyan-300/60 hover:bg-cyan-300/12"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/20">
                  <Upload className="h-5 w-5" />
                </span>
                <span className="mt-4 text-sm font-black text-white">
                  {file ? file.name : "Upload prescription"}
                </span>
                <span className="mt-2 text-xs font-bold text-slate-400">
                  JPEG, PNG, WebP, or PDF up to 12 MB
                </span>
                {file && (
                  <span className="mt-2 text-xs text-slate-500">
                    {file.type || "File"} {formatBytes(file.size)}
                  </span>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,application/pdf"
                className="hidden"
                onChange={(event) => selectFile(event.target.files?.[0])}
              />

              {file && (
                <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/25">
                  {previewUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={previewUrl}
                      alt="Prescription preview"
                      className="max-h-56 w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center gap-3 text-sm font-bold text-slate-300">
                      <FileText className="h-5 w-5 text-cyan-200" />
                      PDF selected
                    </div>
                  )}
                </div>
              )}

              {mode === "validate" && (
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      <UserRound className="h-3.5 w-3.5" />
                      Patient
                    </span>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(event) => setPatientName(event.target.value)}
                      placeholder="Patient name"
                      className="h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/45"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      <Pill className="h-3.5 w-3.5" />
                      Medicines
                    </span>
                    <textarea
                      value={medicinesText}
                      onChange={(event) => setMedicinesText(event.target.value)}
                      rows={5}
                      placeholder={"Amoxicillin\nIbuprofen"}
                      className="w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/45"
                    />
                  </label>
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-auto flex items-center gap-3 pt-5">
                {file && (
                  <button
                    type="button"
                    onClick={clearFile}
                    disabled={loading}
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-red-300/30 hover:bg-red-500/10 hover:text-red-100 disabled:opacity-50"
                    title="Remove file"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 text-sm font-black text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  {mode === "validate" ? "Validate" : "Read Prescription"}
                </button>
              </div>
            </form>

            <section className="app-premium-card min-h-[34rem] rounded-[1.75rem] p-4 sm:p-5">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/20">
                    <ActiveIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black">Result</h2>
                    <p className="text-xs font-bold text-slate-400">
                      {mode === "validate"
                        ? "Patient and medicine validation"
                        : "Extracted medicines, doses, and directions"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={copyResult}
                  disabled={!result}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-black text-slate-300 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              {!result ? (
                <div className="grid min-h-[26rem] place-items-center text-center">
                  <div className="max-w-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white/[0.05] text-cyan-200 ring-1 ring-white/10">
                      <ClipboardCheck className="h-8 w-8" />
                    </div>
                    <h3 className="mt-5 text-xl font-black">
                      Waiting for a prescription
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Upload a file and run the selected workflow. Results will
                      stay on this panel.
                    </p>
                  </div>
                </div>
              ) : result.mode === "extract" ? (
                <div className="space-y-5 pt-5">
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      {
                        label: "Patient",
                        value: getPatient(source) || "Not found",
                        icon: UserRound,
                      },
                      {
                        label: "Doctor",
                        value: getDoctor(source) || "Not found",
                        icon: Stethoscope,
                      },
                      {
                        label: "Date",
                        value:
                          pickValue(source, [
                            "date",
                            "prescriptionDate",
                            "prescription_date",
                          ]) || "Not found",
                        icon: CalendarDays,
                      },
                    ].map((item) => {
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.label}
                          className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                        >
                          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                            <Icon className="h-3.5 w-3.5" />
                            {item.label}
                          </div>
                          <div className="truncate text-sm font-black text-slate-100">
                            {item.value}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      <Pill className="h-3.5 w-3.5" />
                      Medicines and Doses
                    </div>

                    {extractedMedicines.length ? (
                      <div className="grid gap-3 xl:grid-cols-2">
                        {extractedMedicines.map((medicine, index) => (
                          <article
                            key={`${medicine?.name || "medicine"}-${index}`}
                            className="rounded-2xl border border-white/10 bg-black/20 p-4"
                          >
                            <h3 className="font-black text-white">
                              {pickValue(medicine, [
                                "name",
                                "medicine",
                                "medicine_name",
                                "medication",
                                "drug",
                              ]) || `Medicine ${index + 1}`}
                            </h3>
                            <div className="mt-3 grid gap-2 text-sm text-slate-300">
                              {[
                                ["Dose", ["dosage", "dose", "strength"]],
                                ["Frequency", ["frequency", "freq"]],
                                ["Duration", ["duration", "days"]],
                                [
                                  "Instructions",
                                  ["instructions", "instruction", "sig", "route", "notes"],
                                ],
                              ].map(([label, keys]) => {
                                const value = pickValue(medicine, keys);
                                if (!value) return null;

                                return (
                                  <div
                                    key={label}
                                    className="flex justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2"
                                  >
                                    <span className="font-bold text-slate-500">
                                      {label}
                                    </span>
                                    <span className="text-right font-bold text-slate-100">
                                      {value}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm font-bold text-slate-400">
                        No medicines were found in the response.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-5 pt-5">
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      {
                        label: "Valid",
                        value: isValid === true ? "Yes" : isValid === false ? "No" : "Unknown",
                        good: isValid === true,
                      },
                      {
                        label: "Patient Match",
                        value:
                          patientMatch === true
                            ? "Yes"
                            : patientMatch === false
                            ? "No"
                            : "Unknown",
                        good: patientMatch === true,
                      },
                      {
                        label: "Confidence",
                        value:
                          validation?.confidence ??
                          validation?.validations?.overall?.confidence ??
                          "Unknown",
                        good: null,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                      >
                        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                          {item.good === false ? (
                            <XCircle className="h-3.5 w-3.5 text-red-300" />
                          ) : item.good === true ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                          ) : (
                            <ClipboardCheck className="h-3.5 w-3.5 text-cyan-200" />
                          )}
                          {item.label}
                        </div>
                        <div className="text-sm font-black text-slate-100">
                          {String(item.value)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      <Pill className="h-3.5 w-3.5" />
                      Medicine Checks
                    </div>

                    {validationRows.length ? (
                      <div className="grid gap-3 xl:grid-cols-2">
                        {validationRows.map((item, index) => (
                          <article
                            key={`${item?.name || "medicine"}-${index}`}
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-2xl border p-4",
                              item?.found
                                ? "border-emerald-300/20 bg-emerald-300/10"
                                : "border-red-300/20 bg-red-500/10"
                            )}
                          >
                            <div className="min-w-0">
                              <h3 className="truncate font-black text-white">
                                {item?.name || `Medicine ${index + 1}`}
                              </h3>
                              <p className="mt-1 text-xs font-bold text-slate-400">
                                {item?.found ? "Found in prescription" : "Missing"}
                              </p>
                            </div>
                            {item?.found ? (
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
                            ) : (
                              <XCircle className="h-5 w-5 shrink-0 text-red-300" />
                            )}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm font-bold text-slate-400">
                        No medicine-level validation details were returned.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}
