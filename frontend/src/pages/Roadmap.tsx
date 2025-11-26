import { useState, useEffect } from 'react';
import { ExternalLink, BookOpen, Eye, Map, Trash2, FileText, Upload, ArrowLeft, RefreshCw } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { pdfApi } from '@/lib/api';
import { PDF, Roadmap, RoadmapItem } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const RoadmapPage = () => {
  const [view, setView] = useState<'list' | 'roadmap'>('list');
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<PDF | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState<PDF | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPDFs();
  }, []);

  const fetchPDFs = async () => {
    try {
      setLoading(true);
      const response = await pdfApi.listPDFs();
      setPdfs(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load PDFs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewPDF = (pdf: PDF) => {
    const url = pdfApi.viewPDF(pdf._id);
    window.open(url, '_blank');
  };

  const handleGenerateRoadmap = async (pdf: PDF) => {
    try {
      setGeneratingRoadmap(true);
      setSelectedPdf(pdf);

      // Try to get cached roadmap first
      const response = await pdfApi.getRoadmapForPDF(pdf._id);
      setRoadmap(response.data.roadmap);
      setView('roadmap');

      toast({
        title: 'Success',
        description: response.data.cached
          ? 'Roadmap loaded from cache'
          : 'Roadmap generated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load roadmap',
        variant: 'destructive',
      });
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  const handleDeletePDF = async () => {
    if (!pdfToDelete) return;

    try {
      await pdfApi.deletePDF(pdfToDelete._id);
      setPdfs(pdfs.filter(p => p._id !== pdfToDelete._id));
      toast({
        title: 'Success',
        description: 'PDF deleted successfully',
      });
      setDeleteDialogOpen(false);
      setPdfToDelete(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete PDF',
        variant: 'destructive',
      });
    }
  };

  const openDeleteDialog = (pdf: PDF) => {
    setPdfToDelete(pdf);
    setDeleteDialogOpen(true);
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedPdf(null);
    setRoadmap(null);
    setSelectedUnit('0');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // PDF List View
  if (view === 'list') {
    if (loading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      );
    }

    if (pdfs.length === 0) {
      return (
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-background to-academic-light">
            <div className="text-center">
              <Upload className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h2 className="mb-2 text-2xl font-bold">No Study Materials Yet</h2>
              <p className="mb-6 text-muted-foreground">Upload your PDFs to get started</p>
              <Button onClick={() => navigate('/input-notes')}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Materials
              </Button>
            </div>
          </main>
          <Footer />
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 bg-gradient-to-b from-background to-academic-light py-12">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <h1 className="mb-2 text-3xl font-bold">Your Study Materials</h1>
              <p className="text-muted-foreground">Manage your uploaded PDFs and generate roadmaps</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pdfs.map((pdf) => (
                <Card key={pdf._id} className="group transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="flex-1">
                        <CardTitle className="text-lg">{pdf.originalName}</CardTitle>
                        <div className="mt-1 text-sm text-muted-foreground">
                          <div className="flex flex-col gap-1 text-xs">
                            <span>Uploaded {formatDate(pdf.uploadDate)}</span>
                            <span>{formatFileSize(pdf.fileSize)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      {pdf.hasRoadmap ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Roadmap Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          Not Generated
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleViewPDF(pdf)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View PDF
                      </Button>
                      <Button
                        className="w-full"
                        onClick={() => handleGenerateRoadmap(pdf)}
                        disabled={generatingRoadmap}
                      >
                        {generatingRoadmap ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Map className="mr-2 h-4 w-4" />
                            See Roadmap
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => openDeleteDialog(pdf)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
        <Footer />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Study Material?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{pdfToDelete?.originalName}" and its roadmap. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePDF} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Roadmap View
  if (!roadmap || !selectedPdf) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const units = Object.keys(roadmap);
  const currentUnit = roadmap[selectedUnit] || {};
  const topics = Object.entries(currentUnit);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gradient-to-b from-background to-academic-light py-12">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <Button variant="ghost" onClick={handleBackToList} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Materials
            </Button>

            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedPdf.originalName}</CardTitle>
                    <CardDescription>Uploaded {formatDate(selectedPdf.uploadDate)}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!selectedPdf) return;
                      try {
                        setGeneratingRoadmap(true);
                        const response = await pdfApi.generateRoadmap(selectedPdf._id);
                        setRoadmap(response.data.roadmap);
                        toast({
                          title: 'Success',
                          description: 'Roadmap regenerated successfully',
                        });
                      } catch (error) {
                        toast({
                          title: 'Error',
                          description: 'Failed to regenerate roadmap',
                          variant: 'destructive',
                        });
                      } finally {
                        setGeneratingRoadmap(false);
                      }
                    }}
                    disabled={generatingRoadmap}
                  >
                    {generatingRoadmap ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerate Roadmap
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          </div>

          <div className="mb-8">
            <h1 className="mb-4 text-3xl font-bold">Study Roadmap</h1>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Select Unit:</label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      Unit {parseInt(unit) + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-6">
            {topics.map(([topicId, topic]: [string, RoadmapItem]) => (
              <Card
                key={topicId}
                className="border-2 transition-all hover:shadow-lg hover:border-primary cursor-pointer"
                onClick={() => navigate(`/roadmap/${selectedPdf!._id}/topic/${selectedUnit}/${topicId}`, {
                  state: {
                    topicTitle: topic.title,
                    topicSummary: topic.summary
                  }
                })}
              >
                <CardHeader>
                  <CardTitle className="text-xl">{topic.title}</CardTitle>
                  <CardDescription className="text-base">{topic.summary}</CardDescription>
                </CardHeader>
                {topic.links && Object.keys(topic.links).length > 0 && (
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Video Resources:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(topic.links).map(([linkId, url]) => (
                          <Button
                            key={linkId}
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              Video {parseInt(linkId) + 1}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RoadmapPage;
