import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Settings as SettingsIcon, Save, Key, Shield, User, Loader2, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SUBJECT_OPTIONS = [
  "Mathematics",
  "Science",
  "English",
  "Social Studies",
  "History",
  "Geography",
  "Commerce",
  "Computer Science",
  "Physical Education",
  "Other",
];

const CLASS_OPTIONS = [
  "Grade 1-5",
  "Grade 6-8",
  "Grade 9-10",
  "Grade 11-12",
  "College / University",
];

const BOARD_OPTIONS = ["CBSE", "ICSE", "State Board", "IB", "IGCSE", "Other"];
const STUDENT_OPTIONS = ["Under 30", "30-60", "60-100", "100-200", "200+"];

export const Settings: React.FC = () => {
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // New Profile fields
  const [schoolName, setSchoolName] = useState("");
  const [city, setCity] = useState("");
  const [primarySubject, setPrimarySubject] = useState("");
  const [classesTeaching, setClassesTeaching] = useState<string[]>([]);
  const [schoolBoard, setSchoolBoard] = useState("");
  const [approximateStudents, setApproximateStudents] = useState<string>("");

  const [groqKey, setGroqKey] = useState("gsk_••••••••••••••••••••");
  const [youtubeKey, setYoutubeKey] = useState("AIzaSy••••••••••••••••••••");
  const [geminiKey, setGeminiKey] = useState("AIzaSy••••••••••••••••••••");

  // Helper mapping
  const mapApproxStudentsToString = (num: number | null | undefined): string => {
    if (!num) return "";
    if (num <= 25) return "Under 30";
    if (num <= 55) return "30-60";
    if (num <= 90) return "60-100";
    if (num <= 180) return "100-200";
    return "200+";
  };

  const mapApproxStudentsToNumber = (str: string): number | null => {
    if (!str) return null;
    if (str === "Under 30") return 20;
    if (str === "30-60") return 45;
    if (str === "60-100") return 80;
    if (str === "100-200") return 150;
    if (str === "200+") return 300;
    return null;
  };

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setSchoolName(user.schoolName || user.institutionName || "");
      setCity(user.city || user.branch || "");
      setAvatarUrl(user.avatarBase64 || user.avatarUrl || "");
      setPrimarySubject(user.primarySubject || "");
      setClassesTeaching(user.classesTeaching || []);
      setSchoolBoard(user.schoolBoard || "");
      setApproximateStudents(mapApproxStudentsToString(user.approximateStudents));
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        fullName,
        avatarBase64: avatarUrl,
        avatarUrl,
        schoolName,
        institutionName: schoolName,
        city,
        branch: city,
        primarySubject,
        classesTeaching,
        schoolBoard,
        approximateStudents: mapApproxStudentsToNumber(approximateStudents),
      });
    } catch (err) {
      // Error handled inside AuthContext
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-col gap-1 font-sans">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#EA580C]" />
          <h2 className="text-xl font-bold text-gray-800">Settings</h2>
        </div>
        <p className="text-sm text-gray-500">
          Configure profile details, curriculum preferences, and API integrations.
        </p>
      </div>

      <div className="max-w-2xl bg-white rounded-2xl border border-gray-100 p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] pb-12 mb-20 font-sans">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Profile Section */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">
              <User className="h-4 w-4 text-[#EA580C]" />
              <span>Teacher Profile</span>
            </h3>

            {/* Avatar Uploader */}
            <div className="flex items-center gap-6 pb-4">
              <div className="relative group h-20 w-20 overflow-hidden rounded-full border-2 border-gray-100 shadow-sm bg-amber-50 flex items-center justify-center shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-amber-700 uppercase">
                    {fullName ? fullName.slice(0, 2) : (user?.email ? user.email.slice(0, 2) : "JD")}
                  </span>
                )}
                <label className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-semibold">
                  <User className="h-4 w-4 mb-0.5" />
                  Change
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-gray-800">Profile Picture</span>
                <span className="text-xs text-gray-400">JPG, JPEG or PNG. Max size 2MB.</span>
                <button
                  type="button"
                  onClick={() => {
                    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                    fileInput?.click();
                  }}
                  className="mt-1 self-start rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Upload Image
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Email Address</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* School Credentials */}
          <div className="space-y-4 pt-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">
              <Shield className="h-4 w-4 text-[#EA580C]" />
              <span>School Information</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">School Name</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Delhi Public School"
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. New Delhi"
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">School Board (Optional)</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {BOARD_OPTIONS.map((brd) => {
                    const isSelected = schoolBoard === brd;
                    return (
                      <button
                        key={brd}
                        type="button"
                        onClick={() => setSchoolBoard(isSelected ? "" : brd)}
                        className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all ${
                          isSelected
                            ? "bg-black border-black text-white"
                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {brd}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Students You Teach (Optional)</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {STUDENT_OPTIONS.map((st) => {
                    const isSelected = approximateStudents === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setApproximateStudents(isSelected ? "" : st)}
                        className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all ${
                          isSelected
                            ? "bg-black border-black text-white"
                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Curriculum Preferences */}
          <div className="space-y-4 pt-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">
              <BookOpen className="h-4 w-4 text-[#EA580C]" />
              <span>Teaching Curriculum</span>
            </h3>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-600">Primary Subject</label>
              <div className="flex flex-wrap gap-1.5">
                {SUBJECT_OPTIONS.map((sub) => {
                  const isSelected = primarySubject === sub;
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setPrimarySubject(sub)}
                      className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all ${
                        isSelected
                          ? "bg-black border-black text-white"
                          : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <label className="text-xs font-semibold text-gray-600">Classes You Teach</label>
              <div className="flex flex-wrap gap-1.5">
                {CLASS_OPTIONS.map((cls) => {
                  const isSelected = classesTeaching.includes(cls);
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setClassesTeaching(classesTeaching.filter((c) => c !== cls));
                        } else {
                          setClassesTeaching([...classesTeaching, cls]);
                        }
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all ${
                        isSelected
                          ? "bg-black border-black text-white"
                          : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {cls}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* API Integrations */}
          <div className="space-y-4 pt-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">
              <Key className="h-4 w-4 text-[#EA580C]" />
              <span>API Integrations</span>
            </h3>
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Groq API Key</label>
                <input
                  type="password"
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Google Gemini API Key</label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">YouTube Search API Key</label>
                <input
                  type="password"
                  value={youtubeKey}
                  onChange={(e) => setYoutubeKey(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-black px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-gray-900 transition-all disabled:bg-gray-400 animate-none hover:scale-105 duration-200"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{saving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Settings;
