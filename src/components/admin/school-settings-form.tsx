"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  updateSchoolSettingsAction,
  SchoolSettingsData,
} from "@/app/actions/school-settings";
import {
  Building2,
  MapPin,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
} from "lucide-react";

export function SchoolSettingsForm({
  locale,
  settings,
}: {
  locale: string;
  settings: SchoolSettingsData;
}) {
  const router = useRouter();

  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [address, setAddress] = useState(settings.address ?? "");
  const [udiseCode, setUdiseCode] = useState(settings.udiseCode ?? "");

  const [sarvaLogoPreview, setSarvaLogoPreview] = useState<string | null>(
    settings.logoUrlSarvaShiksha
  );
  const [samagraLogoPreview, setSamagraLogoPreview] = useState<string | null>(
    settings.logoUrlSamagra
  );

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  function handleSarvaLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSarvaLogoPreview(URL.createObjectURL(file));
    }
  }

  function handleSamagraLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSamagraLogoPreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("locale", locale);

      const res = await updateSchoolSettingsAction(formData);

      if (res.success) {
        setSuccessMsg(res.message);
        router.refresh();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred while saving settings.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-md text-xs text-green-700 font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* School Information Block */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[hsl(var(--primary))]" />
          School Information / विद्यालय विवरण
        </h2>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              School Name / विद्यालय का नाम <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="schoolName"
              required
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              School Address / विद्यालय का पता
            </label>
            <textarea
              name="address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Block, Tehsil, District details..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-gray-400" />
              UDISE+ Code / यू-डाइस कोड
            </label>
            <input
              type="text"
              name="udiseCode"
              value={udiseCode}
              onChange={(e) => setUdiseCode(e.target.value)}
              placeholder="Pending client confirmation (e.g. 09540000000)"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Leave blank if UDISE code is not yet allotted. You can update this anytime.
            </p>
          </div>
        </div>
      </div>

      {/* Government Branding Logos Block */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
          <Upload className="h-4 w-4 text-[hsl(var(--primary))]" />
          Government Branding Logos / शासकीय प्रतीक चिन्ह
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Sarva Shiksha Abhiyan */}
          <div className="border border-gray-100 rounded-lg p-4 bg-gray-50 flex flex-col items-center text-center space-y-3">
            <span className="font-semibold text-gray-700">
              Sarva Shiksha Abhiyan Logo
            </span>
            <div className="w-48 h-24 relative bg-white border border-gray-200 rounded flex items-center justify-center p-2">
              {sarvaLogoPreview ? (
                <img
                  src={sarvaLogoPreview}
                  alt="Sarva Shiksha Abhiyan"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-gray-400 text-[11px]">No Logo</span>
              )}
            </div>
            <label className="cursor-pointer px-3 py-1.5 bg-white border border-gray-300 rounded text-gray-700 font-medium hover:bg-gray-100 transition-colors text-xs flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5 text-gray-500" />
              Change Logo
              <input
                type="file"
                name="logoSarvaShiksha"
                accept="image/*"
                onChange={handleSarvaLogoChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Samagra Shiksha */}
          <div className="border border-gray-100 rounded-lg p-4 bg-gray-50 flex flex-col items-center text-center space-y-3">
            <span className="font-semibold text-gray-700">
              Samagra Shiksha Logo
            </span>
            <div className="w-48 h-24 relative bg-white border border-gray-200 rounded flex items-center justify-center p-2">
              {samagraLogoPreview ? (
                <img
                  src={samagraLogoPreview}
                  alt="Samagra Shiksha"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-gray-400 text-[11px]">No Logo</span>
              )}
            </div>
            <label className="cursor-pointer px-3 py-1.5 bg-white border border-gray-300 rounded text-gray-700 font-medium hover:bg-gray-100 transition-colors text-xs flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5 text-gray-500" />
              Change Logo
              <input
                type="file"
                name="logoSamagra"
                accept="image/*"
                onChange={handleSamagraLogoChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[hsl(var(--primary))] hover:opacity-90 text-white font-medium text-sm rounded shadow-sm transition-opacity flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings / विवरण सुरक्षित करें
        </button>
      </div>
    </form>
  );
}
