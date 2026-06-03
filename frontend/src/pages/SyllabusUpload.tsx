import { useState, useEffect } from 'react';
import { Image, ArrowRight, CheckCircle2, RotateCcw, Map, FileImage, Library } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { FileUpload } from '@/components/FileUpload';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { coreApi, courseApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const SyllabusUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [pdfId, setPdfId] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('unassigned');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await courseApi.listCourses();
      setCourses(response.data || []);
    } catch (err) {}
  };

  const handleImageUpload = async (file: File) => {
    setFileName(file.name);
    setUploading(true);
    try {
      const courseIdParam = selectedCourseId === 'unassigned' ? null : selectedCourseId;
      const response = await coreApi.parseImg(file, courseIdParam);
      if (response.data && response.data.pdfId) {
        setPdfId(response.data.pdfId);
      }
      setUploaded(true);
      toast({ title: 'Success', description: 'Syllabus uploaded and added to library.' });
    } catch {
      toast({ title: 'Upload failed', description: 'Please try again.', variant: 'destructive' });
      setFileName('');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = async () => {
    try { await coreApi.deleteToken(); } catch {}
    setUploaded(false);
    setFileName('');
    setPdfId('');
  };

  /* ── Loading / generating state ── */
  if (uploading) {
    return (
      <Layout>
        <div className="mx-auto max-w-lg mt-16 flex flex-col items-center gap-6 text-center">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-extrabold text-white font-serif">A</span>
            </div>
            <div className="absolute -inset-2 rounded-full border-2 border-orange-300 border-t-transparent animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Extracting topics…</h2>
          <p className="text-sm text-gray-500 max-w-xs">
            AdeptAi is reading <span className="font-semibold text-gray-700">"{fileName}"</span> and extracting the topic structure.
          </p>
        </div>
      </Layout>
    );
  }

  /* ── Success state ── */
  if (uploaded) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl mt-10 flex flex-col gap-4">
          {/* Main success card */}
          <div className="rounded-2xl border border-green-100 dark:border-green-900/30 bg-white dark:bg-gray-900 p-8 shadow-sm flex flex-col items-center gap-5 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Syllabus uploaded successfully!</h2>
              <p className="text-sm text-gray-500">
                Your syllabus is now processed and available in <strong>My Library</strong>.
              </p>
            </div>

            {/* File name pill */}
            <div className="flex items-center gap-2 rounded-full border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2">
              <FileImage className="h-4 w-4 text-orange-400 shrink-0" />
              <span className="text-sm font-medium text-gray-700 truncate max-w-xs">{fileName}</span>
            </div>

            {/* Info box */}
            <div className="w-full rounded-xl bg-amber-50 border border-amber-100 p-4 text-left text-sm text-amber-800">
              <p className="font-semibold mb-1">📋 What would you like to do?</p>
              <p className="text-xs leading-relaxed text-amber-700">
                You can generate a structured study roadmap directly from your syllabus topics, or upload your lecture notes to create a detailed aligned roadmap.
              </p>
            </div>
          </div>

          {/* CTAs */}
          <button
            onClick={() => navigate(`/library?generate=${pdfId}`)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-black py-3.5 text-sm font-semibold text-white hover:bg-gray-900 transition-all shadow-md animate-pulse hover:animate-none"
          >
            <Map className="h-4 w-4" />
            Proceed to Generate Roadmap
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={handleReset}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            Upload a Different Syllabus
          </button>

          <button
            onClick={() => navigate('/library')}
            className="mt-2 text-center text-xs font-semibold text-gray-500 hover:text-black transition-colors flex items-center justify-center gap-1.5"
          >
            <Library className="h-3.5 w-3.5" />
            Go to My Library
          </button>
        </div>
      </Layout>
    );
  }

  /* ── Upload state ── */
  return (
    <Layout>
      <div className="mx-auto max-w-xl mt-6">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Upload Your Syllabus</h1>
          <p className="text-sm text-gray-500">
            Upload a photo or scan of your syllabus. AdeptAi will extract all topics automatically.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-7 shadow-sm flex flex-col gap-5">
          {/* Course Folder Selection */}
          {courses.length > 0 && (
            <Card className="border-orange-500/20 bg-orange-50/5 rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-gray-800 text-xs">Assign to Course Folder</h3>
                  <p className="text-[10px] text-muted-foreground">Select which course subject folder to save this syllabus into.</p>
                </div>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger className="rounded-xl bg-white border-gray-200 text-xs py-1">
                    <SelectValue placeholder="Select Course" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="unassigned">Unassigned (General)</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course._id} value={course._id}>{course.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
              <Image className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Syllabus Image</p>
              <p className="text-xs text-gray-400">Supported: JPG, JPEG, PNG</p>
            </div>
          </div>

          <FileUpload
            onFileSelect={handleImageUpload}
            accept=".jpg,.jpeg,.png"
            disabled={uploading}
          />

          <p className="text-center text-xs text-gray-400">
            After upload, topics will be extracted and you'll be guided to generate a roadmap.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default SyllabusUpload;