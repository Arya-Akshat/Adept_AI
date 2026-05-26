import { useState, useEffect } from 'react';
import { Image, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { coreApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const SyllabusUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasSyllabus, setHasSyllabus] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      await coreApi.getToken();
      setHasSyllabus(true);
    } catch {
      setHasSyllabus(false);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      await coreApi.parseImg(file);
      toast({
        title: 'Success',
        description: 'Syllabus uploaded successfully',
      });
      setHasSyllabus(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload syllabus',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gradient-to-b from-background to-academic-light py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 text-center">
              <h1 className="mb-4 text-3xl font-bold">Step 1: Upload Your Syllabus</h1>
              <p className="text-muted-foreground">
                {hasSyllabus
                  ? 'Your syllabus is already uploaded. You can continue to notes now.'
                  : 'Upload a syllabus image to unlock notes and roadmap generation.'}
              </p>
            </div>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Image className="h-6 w-6" />
                </div>
                <CardTitle>Upload Syllabus</CardTitle>
                <CardDescription>
                  Supported formats: JPG, JPEG, PNG
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FileUpload
                  onFileSelect={handleImageUpload}
                  accept=".jpg,.jpeg,.png"
                  disabled={uploading}
                />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => navigate('/input-notes')}
                    disabled={!hasSyllabus}
                    className="flex-1"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Continue to Upload Notes
                  </Button>
                  <Button variant="outline" onClick={checkToken} disabled={uploading}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Refresh Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SyllabusUpload;