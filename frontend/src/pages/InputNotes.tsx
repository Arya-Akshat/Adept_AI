import { useState, useEffect } from 'react';
import { FileText, Image, Link2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { coreApi, pdfApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const InputNotes = () => {
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      await coreApi.getToken();
      setHasSession(true);
    } catch (error) {
      setHasSession(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePDFUpload = async (file: File) => {
    setUploading(true);
    try {
      await pdfApi.uploadPDF(file);
      toast({
        title: 'Success',
        description: 'PDF uploaded successfully',
      });
      navigate('/roadmap');
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

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      await coreApi.parseImg(file);
      toast({
        title: 'Success',
        description: 'Syllabus uploaded successfully',
      });
      setHasSession(true);
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

  const handleGoogleClassroom = async () => {
    setUploading(true);
    try {
      await coreApi.parseLink();
      toast({
        title: 'Success',
        description: 'Google Classroom connected successfully',
      });
      navigate('/roadmap');
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
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <h1 className="mb-4 text-3xl font-bold">Upload Your Study Materials</h1>
              <p className="text-muted-foreground">
                {hasSession
                  ? 'Upload your course materials to generate a study roadmap'
                  : 'Start by uploading your syllabus'}
              </p>
            </div>

            {hasSession ? (
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
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
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
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
                      className="w-full"
                      variant="outline"
                    >
                      Connect Google Classroom
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Image className="h-6 w-6" />
                  </div>
                  <CardTitle>Upload Syllabus</CardTitle>
                  <CardDescription>
                    Upload an image of your course syllabus to get started
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUpload
                    onFileSelect={handleImageUpload}
                    accept=".jpg,.jpeg,.png"
                    disabled={uploading}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default InputNotes;
