import { useState, useEffect } from 'react';
import { FileText, Link2, ArrowLeft } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { coreApi, pdfApi, courseApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const InputNotes = () => {
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('unassigned');
  const navigate = useNavigate();

  useEffect(() => {
    checkSessionAndCourses();
  }, []);

  const checkSessionAndCourses = async () => {
    try {
      const [tokenRes, courseRes] = await Promise.all([
        coreApi.getToken(),
        courseApi.listCourses()
      ]);
      setHasSession(true);
      setCourses(courseRes.data || []);
    } catch (error) {
      setHasSession(false);
      // Even if token check fails, try to load courses if authorized
      try {
        const courseRes = await courseApi.listCourses();
        setCourses(courseRes.data || []);
      } catch (err) {}
    } finally {
      setLoading(false);
    }
  };

  const handlePDFUpload = async (file: File) => {
    setUploading(true);
    try {
      const courseIdParam = selectedCourseId === 'unassigned' ? null : selectedCourseId;
      await pdfApi.uploadPDF(file, courseIdParam);
      toast({
        title: 'Success',
        description: 'PDF uploaded successfully',
      });
      navigate('/library');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload PDF',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleGoogleClassroom = async () => {
    setUploading(true);
    try {
      await coreApi.parseLink();
      toast({
        title: 'Success',
        description: 'Google Classroom connected successfully',
      });
      navigate('/library');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect Google Classroom',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl mt-6">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-3xl font-bold">Upload Your Study Materials</h1>
          <p className="text-muted-foreground">
            Upload your course materials to generate a study roadmap
          </p>
        </div>

        {!hasSession && (
          <Card className="mb-6 border-orange-500/30 bg-orange-50/5">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Want to align with a syllabus? (Optional)</h3>
                <p className="text-sm text-muted-foreground">
                  You can upload a syllabus image first so AdeptAi aligns your roadmap with it.
                </p>
              </div>
              <Button onClick={() => navigate('/syllabus')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Upload Syllabus First
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Course Folder Selection */}
        {hasSession && courses.length > 0 && (
          <Card className="mb-6 border-orange-500/20 bg-orange-50/5 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-gray-800 text-sm">Assign to Course Folder</h3>
                  <p className="text-xs text-muted-foreground">Select which course subject folder to save this PDF note into.</p>
                </div>
                <div className="w-full sm:w-[280px] shrink-0">
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger className="rounded-xl bg-white border-gray-200">
                      <SelectValue placeholder="Select Course" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="unassigned">Unassigned (General)</SelectItem>
                      {courses.map((course) => (
                        <SelectItem key={course._id} value={course._id}>{course.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-[#EA580C]/10 text-[#EA580C]">
                <FileText className="h-6 w-6" />
              </div>
              <CardTitle>Upload PDF</CardTitle>
              <CardDescription>
                Upload your course materials or lecture notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                onFileSelect={handlePDFUpload}
                accept=".pdf"
                disabled={uploading}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-[#EA580C]">
                <Link2 className="h-6 w-6" />
              </div>
              <CardTitle>Google Classroom</CardTitle>
              <CardDescription>
                Connect your Google Classroom account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleGoogleClassroom}
                disabled={uploading}
                className="w-full border-gray-200 text-gray-700 hover:bg-gray-50"
                variant="outline"
              >
                Connect Google Classroom
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default InputNotes;
