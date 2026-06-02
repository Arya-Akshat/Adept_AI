import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AdeptLogo } from "@/components/AdeptLogo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCircle,
  GraduationCap,
  Sparkles,
  CheckCircle,
  Camera,
  X,
  FileText,
  MessageSquare,
  Calendar,
  ChevronRight,
  ArrowLeft,
  Loader2
} from "lucide-react";

// Feature Highlights list for the rotating left-column card
const FEATURE_HIGHLIGHTS = [
  {
    title: "Generate exam papers in seconds",
    description: "Create assessments matching your curriculum difficulty and types.",
    icon: FileText,
  },
  {
    title: "AI-powered doubt solver",
    description: "Provide students with instant answers mapped to your uploaded materials.",
    icon: MessageSquare,
  },
  {
    title: "Lesson plans & rubrics on demand",
    description: "Plan your syllabus and grade student work with tailored rubrics.",
    icon: Calendar,
  },
];

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
const REFERRAL_OPTIONS = [
  "Social Media",
  "Friend / Colleague",
  "Google Search",
  "School Recommended",
  "Other",
];

export const OnboardingPage: React.FC = () => {
  const { user, loading, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  // Redirect if user not logged in or already onboarded
  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
      } else if (user.onboardingCompleted) {
        navigate("/assignments");
      }
    }
  }, [user, loading, navigate]);

  // Form states local to this page
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitTimeElapsed, setSubmitTimeElapsed] = useState(false);
  const submitTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [avatarBase64, setAvatarBase64] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [city, setCity] = useState("");
  const [primarySubject, setPrimarySubject] = useState("");
  const [classesTeaching, setClassesTeaching] = useState<string[]>([]);
  const [schoolBoard, setSchoolBoard] = useState("");
  const [approximateStudents, setApproximateStudents] = useState<string>("");
  const [referralSource, setReferralSource] = useState("");

  // Restore draft state from sessionStorage
  useEffect(() => {
    try {
      const draft = sessionStorage.getItem("adeptai_onboarding_draft");
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.avatarBase64) setAvatarBase64(parsed.avatarBase64);
        if (parsed.schoolName) setSchoolName(parsed.schoolName);
        if (parsed.city) setCity(parsed.city);
        if (parsed.primarySubject) setPrimarySubject(parsed.primarySubject);
        if (parsed.classesTeaching) setClassesTeaching(parsed.classesTeaching);
        if (parsed.schoolBoard) setSchoolBoard(parsed.schoolBoard);
        if (parsed.approximateStudents) setApproximateStudents(parsed.approximateStudents);
        if (parsed.referralSource) setReferralSource(parsed.referralSource);
        if (parsed.step) setStep(parsed.step);
      }
    } catch (e) {
      // Ignore parse issues
    }
  }, []);

  // Save draft state to sessionStorage
  useEffect(() => {
    const draft = {
      fullName,
      avatarBase64,
      schoolName,
      city,
      primarySubject,
      classesTeaching,
      schoolBoard,
      approximateStudents,
      referralSource,
      step,
    };
    sessionStorage.setItem("adeptai_onboarding_draft", JSON.stringify(draft));
  }, [
    fullName,
    avatarBase64,
    schoolName,
    city,
    primarySubject,
    classesTeaching,
    schoolBoard,
    approximateStudents,
    referralSource,
    step,
  ]);

  // Handle Left Column Testimonial Rotation
  const [activeHighlight, setActiveHighlight] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveHighlight((prev) => (prev + 1) % FEATURE_HIGHLIGHTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Photo Upload Handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Step 1 Validation
  const isStep1Valid = fullName.trim().length >= 2;

  // Step 2 Validation
  const isStep2Valid =
    schoolName.trim().length >= 2 &&
    city.trim().length >= 1 &&
    primarySubject.trim().length >= 1 &&
    classesTeaching.length >= 1;

  // Go Forward
  const nextStep = () => {
    if (step === 1 && isStep1Valid) {
      setDirection(1);
      setStep(2);
    } else if (step === 2 && isStep2Valid) {
      setDirection(1);
      setStep(3);
    }
  };

  // Go Backward
  const prevStep = () => {
    if (step > 1 && !isSubmitting) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  // Key Event Handlers for keyboard navigation
  const handleKeyDownStep1 = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isStep1Valid) {
      e.preventDefault();
      nextStep();
    }
  };

  const handleKeyDownStep2 = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isStep2Valid) {
      e.preventDefault();
      nextStep();
    }
  };

  // Submit Final Data
  const handleSubmit = async () => {
    if (!isStep1Valid || !isStep2Valid) {
      toast.error("Please fill out all mandatory fields correctly.");
      return;
    }

    setIsSubmitting(true);
    setSubmitTimeElapsed(false);

    // If API call takes > 3 seconds, show progress text
    submitTimerRef.current = setTimeout(() => {
      setSubmitTimeElapsed(true);
    }, 3000);

    try {
      // Map approximateStudents to number or null
      let approxNum: number | null = null;
      if (approximateStudents) {
        if (approximateStudents === "Under 30") approxNum = 20;
        else if (approximateStudents === "30-60") approxNum = 45;
        else if (approximateStudents === "60-100") approxNum = 80;
        else if (approximateStudents === "100-200") approxNum = 150;
        else if (approximateStudents === "200+") approxNum = 300;
      }

      await completeOnboarding({
        fullName,
        schoolName,
        city,
        primarySubject,
        classesTeaching,
        schoolBoard: schoolBoard || undefined,
        approximateStudents: approxNum,
        referralSource: referralSource || undefined,
        avatarBase64: avatarBase64 || undefined,
      });

      // Clear draft storage
      sessionStorage.removeItem("adeptai_onboarding_draft");

      // Redirect with welcome toast
      const firstName = fullName.split(" ")[0] || fullName;
      toast.success(`Welcome to AdeptAI, ${firstName}! 🎉`, {
        position: "top-center",
        duration: 4000,
      });
      navigate("/assignments");
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || "Failed to save profile. Please try again.");
    } finally {
      setIsSubmitting(false);
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    }
  };

  // Render Loader if auth loading, user missing or already completed
  if (loading || !user || user.onboardingCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5]">
        <Loader2 className="h-10 w-10 animate-spin text-[#EA580C]" />
      </div>
    );
  }

  // Animation variants for slide transition
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.25, ease: "easeInOut" },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -100 : 100,
      opacity: 0,
      transition: { duration: 0.25, ease: "easeInOut" },
    }),
  };

  const activeHighlightData = FEATURE_HIGHLIGHTS[activeHighlight];
  const ActiveIcon = activeHighlightData.icon;

  return (
    <div className="relative flex min-h-screen w-full overflow-x-hidden bg-[#f5f5f5] font-sans selection:bg-black selection:text-white">
      {/* Drifting subtle gradient blobs */}
      <style>{`
        @keyframes driftOne {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(60px, -40px) scale(1.1); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes driftTwo {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-50px, 60px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .blob-one {
          animation: driftOne 20s infinite ease-in-out;
        }
        .blob-two {
          animation: driftTwo 25s infinite ease-in-out;
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[20%] left-[10%] w-[350px] h-[350px] rounded-full bg-orange-100 opacity-[0.12] blur-[80px] blob-one" />
        <div className="absolute bottom-[25%] right-[15%] w-[400px] h-[400px] rounded-full bg-gray-300 opacity-[0.15] blur-[90px] blob-two" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex w-full min-h-screen">
        {/* LEFT COLUMN: 40% width, hidden on mobile */}
        <div className="hidden md:flex md:w-[40%] flex-col justify-between bg-[#111111] p-12 text-white shrink-0 rounded-r-[32px] shadow-2xl relative overflow-hidden">
          {/* Top Logo */}
          <div className="z-10">
            <AdeptLogo variant={3} />
          </div>

          {/* Central Title/Icon Section */}
          <div className="z-10 flex flex-col justify-center flex-1 my-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-6"
              >
                {step === 1 && (
                  <>
                    <div className="h-20 w-20 flex items-center justify-center rounded-2xl bg-white/5 border border-white/15 shadow-inner">
                      <UserCircle className="h-12 w-12 text-orange-400" />
                    </div>
                    <div>
                      <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
                        Welcome to <span className="text-orange-400">AdeptAI</span>
                      </h2>
                      <p className="text-gray-400 mt-2 text-sm leading-relaxed">
                        Let's set up your profile and get to know you better.
                      </p>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="h-20 w-20 flex items-center justify-center rounded-2xl bg-white/5 border border-white/15 shadow-inner">
                      <GraduationCap className="h-12 w-12 text-orange-400" />
                    </div>
                    <div>
                      <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
                        Your Teaching Setup
                      </h2>
                      <p className="text-gray-400 mt-2 text-sm leading-relaxed">
                        Tell us about your school environment and classes.
                      </p>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="h-20 w-20 flex items-center justify-center rounded-2xl bg-white/5 border border-white/15 shadow-inner">
                      <Sparkles className="h-12 w-12 text-orange-400" />
                    </div>
                    <div>
                      <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
                        You're all set!
                      </h2>
                      <p className="text-gray-400 mt-2 text-sm leading-relaxed">
                        Your personalized teaching assistant is ready to build.
                      </p>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Testimonial Feature Highlights Carousel */}
          <div className="z-10 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeHighlight}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex gap-4 items-start"
              >
                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
                  <ActiveIcon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-gray-100">{activeHighlightData.title}</span>
                  <span className="text-xs text-gray-400 mt-1 leading-normal">
                    {activeHighlightData.description}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dots navigation */}
            <div className="flex gap-1.5 mt-4 justify-start">
              {FEATURE_HIGHLIGHTS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeHighlight ? "w-4 bg-orange-400" : "w-1.5 bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 60% width, full width on mobile */}
        <div className="flex flex-1 flex-col items-center justify-between p-6 md:p-12 bg-white overflow-y-auto min-h-screen">
          {/* Mobile header (AdeptAI Logo) */}
          <div className="w-full max-w-[480px] flex justify-between items-center mb-6 md:hidden">
            <AdeptLogo variant={2} />
          </div>

          {/* Progress Indicator */}
          <div className="w-full max-w-[480px] flex flex-col items-center gap-3 py-4 border-b border-gray-100 mb-6 shrink-0">
            <div className="flex items-center justify-between w-full max-w-[280px] relative">
              {/* Connecting line */}
              <div className="absolute top-[9px] left-3 right-3 h-[2px] bg-gray-100 z-0" />
              <div
                className="absolute top-[9px] left-3 h-[2px] bg-black z-0 transition-all duration-300"
                style={{
                  width: step === 1 ? "0%" : step === 2 ? "50%" : "100%",
                }}
              />

              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  disabled={s > step && s !== 2 && s !== 1} // Disallow jumping forward
                  onClick={() => {
                    if (s < step) {
                      setDirection(-1);
                      setStep(s);
                    } else if (s === 2 && isStep1Valid) {
                      setDirection(1);
                      setStep(2);
                    }
                  }}
                  className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-extrabold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
                    s < step
                      ? "bg-black border-black text-white"
                      : s === step
                      ? "bg-white border-black text-black scale-110 shadow-sm"
                      : "bg-white border-gray-200 text-gray-400"
                  }`}
                >
                  {s < step ? "✓" : s}
                </button>
              ))}
            </div>

            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-1">
              {step === 1 && "Step 1 of 3 — Personal Details"}
              {step === 2 && "Step 2 of 3 — Teaching Profile"}
              {step === 3 && "Step 3 of 3 — Almost Done"}
            </span>
          </div>

          {/* Steps Animations Container */}
          <div className="w-full max-w-[480px] flex-1 flex flex-col justify-center my-6">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex flex-col"
              >
                {/* STEP 1: PERSONAL DETAILS */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
                        Tell us about yourself
                      </h1>
                      <p className="text-sm text-gray-500 mt-1.5">
                        This helps us personalize your AdeptAI experience.
                      </p>
                    </div>

                    <div className="space-y-5 pt-2">
                      {/* Avatar Upload */}
                      <div className="flex flex-col items-center gap-3">
                        <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider self-start">
                          Profile Photo <span className="text-gray-400">(Optional)</span>
                        </Label>
                        <div className="relative group h-28 w-28 overflow-hidden rounded-full border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center shrink-0 shadow-inner">
                          {avatarBase64 ? (
                            <>
                              <img src={avatarBase64} alt="Avatar Preview" className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setAvatarBase64("")}
                                className="absolute top-1 right-1 bg-black text-white p-1 rounded-full hover:bg-gray-800 transition-colors shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <label className="flex flex-col items-center justify-center cursor-pointer h-full w-full focus-within:ring-2 focus-within:ring-black focus-within:ring-offset-2 rounded-full">
                              <Camera className="h-7 w-7 text-gray-400" />
                              <span className="text-[10px] text-gray-400 font-semibold mt-1">Upload</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePhotoUpload}
                              />
                            </label>
                          )}
                        </div>
                        {avatarBase64 && (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Uploaded successfully
                          </span>
                        )}
                      </div>

                      {/* Full Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="fullName" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Full Name *
                        </Label>
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="e.g. Priya Sharma"
                          value={fullName}
                          onKeyDown={handleKeyDownStep1}
                          onChange={(e) => setFullName(e.target.value)}
                          className="rounded-xl border-gray-200 focus:border-black focus:ring-black focus-visible:ring-black px-4 py-3 h-auto text-sm"
                        />
                        {fullName.trim().length > 0 && fullName.trim().length < 2 && (
                          <p className="text-xs text-red-500 font-semibold">Name must be at least 2 characters</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-6 space-y-3">
                      <Button
                        onClick={nextStep}
                        disabled={!isStep1Valid}
                        className="w-full rounded-full bg-black hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 text-white font-bold py-3.5 h-auto text-sm flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <span>Continue</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <button
                        type="button"
                        onClick={nextStep}
                        disabled={!isStep1Valid}
                        className="w-full text-center text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-700"
                      >
                        Skip for now
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: TEACHING SETUP */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
                        Your Teaching Setup
                      </h1>
                      <p className="text-sm text-gray-500 mt-1.5">
                        Tell us about your school setup and subjects.
                      </p>
                    </div>

                    <div className="space-y-5 pt-2 max-h-[48vh] overflow-y-auto px-1">
                      {/* School Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="schoolName" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          School Name *
                        </Label>
                        <Input
                          id="schoolName"
                          type="text"
                          placeholder="e.g. Delhi Public School, Sector 4"
                          value={schoolName}
                          onKeyDown={handleKeyDownStep2}
                          onChange={(e) => setSchoolName(e.target.value)}
                          className="rounded-xl border-gray-200 focus:border-black focus:ring-black px-4 py-3 h-auto text-sm"
                        />
                      </div>

                      {/* City */}
                      <div className="space-y-1.5">
                        <Label htmlFor="city" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          City *
                        </Label>
                        <Input
                          id="city"
                          type="text"
                          placeholder="e.g. New Delhi"
                          value={city}
                          onKeyDown={handleKeyDownStep2}
                          onChange={(e) => setCity(e.target.value)}
                          className="rounded-xl border-gray-200 focus:border-black focus:ring-black px-4 py-3 h-auto text-sm"
                        />
                      </div>

                      {/* Primary Subject */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Primary Subject *
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {SUBJECT_OPTIONS.map((sub) => {
                            const isSelected = primarySubject === sub;
                            return (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => setPrimarySubject(sub)}
                                className={`rounded-xl border py-2.5 px-3 text-xs font-bold text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
                                  isSelected
                                    ? "bg-black border-black text-white scale-[0.98] shadow-inner"
                                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                                }`}
                              >
                                {sub}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Classes You Teach */}
                      <div className="space-y-2">
                        <div className="flex flex-col gap-0.5">
                          <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Classes You Teach *
                          </Label>
                          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Select all that apply</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
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
                                className={`rounded-xl border py-2.5 px-3 text-xs font-bold text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
                                  isSelected
                                    ? "bg-black border-black text-white scale-[0.98] shadow-inner"
                                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                                }`}
                              >
                                {cls}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* School Board (Optional) */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          School Board <span className="text-gray-400 font-semibold">(Optional)</span>
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                          {BOARD_OPTIONS.map((brd) => {
                            const isSelected = schoolBoard === brd;
                            return (
                              <button
                                key={brd}
                                type="button"
                                onClick={() => setSchoolBoard(isSelected ? "" : brd)}
                                className={`rounded-xl border py-2 px-1 text-xs font-bold text-center truncate transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
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

                      {/* Students (Optional) */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Students You Teach <span className="text-gray-400 font-semibold">(Optional)</span>
                        </Label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {STUDENT_OPTIONS.map((st) => {
                            const isSelected = approximateStudents === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setApproximateStudents(isSelected ? "" : st)}
                                className={`rounded-xl border py-2 px-1 text-[11px] font-bold text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
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

                      {/* Referral (Optional) */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          How did you find us? <span className="text-gray-400 font-semibold">(Optional)</span>
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {REFERRAL_OPTIONS.map((ref) => {
                            const isSelected = referralSource === ref;
                            return (
                              <button
                                key={ref}
                                type="button"
                                onClick={() => setReferralSource(isSelected ? "" : ref)}
                                className={`rounded-xl border py-2 px-1 text-xs font-bold text-center truncate transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
                                  isSelected
                                    ? "bg-black border-black text-white"
                                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                                }`}
                              >
                                {ref}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 flex gap-3">
                      <Button
                        type="button"
                        onClick={prevStep}
                        className="rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-bold py-3.5 px-6 h-auto text-sm flex items-center justify-center gap-1.5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back</span>
                      </Button>
                      <Button
                        onClick={nextStep}
                        disabled={!isStep2Valid}
                        className="flex-1 rounded-full bg-black hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 text-white font-bold py-3.5 h-auto text-sm flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <span>Continue</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3: READY CELEBRATION SCREEN */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
                        You're all set, {fullName.split(" ")[0]}! 🎉
                      </h1>
                      <p className="text-sm text-gray-500 mt-1.5">
                        Here's what AdeptAI has prepared for you.
                      </p>
                    </div>

                    {/* Summary Info Card */}
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-extrabold text-gray-800">
                        {avatarBase64 ? (
                          <img src={avatarBase64} alt="Avatar" className="h-6 w-6 rounded-full object-cover border border-amber-200" />
                        ) : (
                          <span>👤</span>
                        )}
                        <span>{fullName}</span>
                        <span className="text-gray-300 font-light">|</span>
                        <span className="text-gray-500 font-semibold">{schoolName}, {city}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                        <span>📚</span>
                        <span>
                          Teaching: <span className="font-bold text-gray-700">{primarySubject}</span> · {classesTeaching.join(", ")}
                        </span>
                      </div>
                      {schoolBoard && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                          <span>🏫</span>
                          <span>Board: {schoolBoard}</span>
                        </div>
                      )}
                    </div>

                    {/* Features Grid */}
                    <div className="space-y-3 pt-2">
                      <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Workspace Previews</h3>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center gap-4 bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] rounded-xl p-3.5 hover:shadow-md transition-shadow">
                          <div className="p-2 bg-orange-50 border border-orange-100 text-[#EA580C] rounded-lg shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-gray-800">Assessment Creator</h4>
                            <p className="text-[10px] text-gray-400 leading-normal mt-0.5">Generate structured question papers in seconds.</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] rounded-xl p-3.5 hover:shadow-md transition-shadow">
                          <div className="p-2 bg-orange-50 border border-orange-100 text-[#EA580C] rounded-lg shrink-0">
                            <MessageSquare className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-gray-800">Doubt Solver</h4>
                            <p className="text-[10px] text-gray-400 leading-normal mt-0.5">AI answers student doubts directly from your materials.</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] rounded-xl p-3.5 hover:shadow-md transition-shadow">
                          <div className="p-2 bg-orange-50 border border-orange-100 text-[#EA580C] rounded-lg shrink-0">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-gray-800">Lesson Planner</h4>
                            <p className="text-[10px] text-gray-400 leading-normal mt-0.5">Plan lessons and grading rubrics with one click.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-6 space-y-3">
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full rounded-full bg-black hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 text-white font-extrabold py-4 h-auto text-sm shadow-lg flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                            <span>Setting up your workspace...</span>
                          </>
                        ) : (
                          <>
                            <span>Start Teaching with AI</span>
                            <ChevronRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                      
                      {isSubmitting && submitTimeElapsed && (
                        <p className="text-center text-xs text-orange-600 font-bold animate-pulse">
                          Almost there... configuring dashboard layout
                        </p>
                      )}

                      {!isSubmitting && (
                        <button
                          type="button"
                          onClick={prevStep}
                          className="w-full text-center text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors py-1 flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-700"
                        >
                          <ArrowLeft className="h-3 w-3" /> Go back and edit details
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer copyright */}
          <div className="w-full text-center text-[10px] text-gray-400 mt-6 shrink-0">
            © 2026 AdeptAi. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
