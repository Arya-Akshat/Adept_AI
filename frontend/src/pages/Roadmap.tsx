import { useState, useEffect } from 'react';
import { ExternalLink, BookOpen, Eye, Map, Trash2, FileText, Upload, ArrowLeft, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Layout } from '@/components/Layout';
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
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState<PDF | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPDFs();
  }, []);

  // Restore roadmap view when navigating back from TopicDetail
  useEffect(() => {
    const restorePdfId = sessionStorage.getItem('roadmap_restore_pdfId');
    const restoreUnit = sessionStorage.getItem('roadmap_restore_unit') || '0';
    if (restorePdfId && pdfs.length > 0) {
      sessionStorage.removeItem('roadmap_restore_pdfId');
      sessionStorage.removeItem('roadmap_restore_unit');
      const pdf = pdfs.find(p => p.id === restorePdfId);
      if (pdf) handleGenerateRoadmap(pdf, restoreUnit);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfs]);

  // Check for 'generate' query parameter to auto-start generation
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const generateId = queryParams.get('generate');
    if (generateId && pdfs.length > 0) {
      const pdf = pdfs.find(p => p.id === generateId);
      if (pdf) {
        // Remove generate parameter from URL so it doesn't trigger again on refresh
        navigate('/library', { replace: true });
        handleGenerateRoadmap(pdf);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfs, navigate]);

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
    const url = pdfApi.viewPDF(pdf.id);
    window.open(url, '_blank');
  };

  const handleGenerateRoadmap = async (pdf: PDF, restoreUnit?: string) => {
    try {
      setGeneratingPdfId(pdf.id);
      setSelectedPdf(pdf);

      // Try to get cached roadmap first
      const response = await pdfApi.getRoadmapForPDF(pdf.id);
      setRoadmap(response.data.roadmap);
      if (restoreUnit) setSelectedUnit(restoreUnit);
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
      setGeneratingPdfId(null);
    }
  };

  const handleDeletePDF = async () => {
    if (!pdfToDelete) return;

    try {
      await pdfApi.deletePDF(pdfToDelete.id);
      setPdfs(pdfs.filter(p => p.id !== pdfToDelete.id));
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
        <Layout>
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
          </div>
        </Layout>
      );
    }

    if (pdfs.length === 0) {
      return (
        <Layout>
          <div className="flex h-64 flex-col items-center justify-center text-center mt-12">
            <Upload className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 text-2xl font-bold">No Study Materials Yet</h2>
            <p className="mb-6 text-muted-foreground">Upload your PDFs to get started</p>
            <Button onClick={() => navigate('/syllabus')} className="bg-black text-white hover:bg-gray-900 rounded-xl px-5 py-2.5">
              <Upload className="mr-2 h-4 w-4" />
              Upload Materials
            </Button>
          </div>
        </Layout>
      );
    }

    return (
      <Layout>
        <div className="mb-8 mt-4">
          <h1 className="mb-2 text-3xl font-bold">Your Study Materials</h1>
          <p className="text-muted-foreground text-sm">Manage your uploaded PDFs and generate study roadmaps.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-20">
          {pdfs.map((pdf) => (
            <Card key={pdf.id} className="group transition-all hover:shadow-lg rounded-2xl border-gray-100">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA580C]/10 text-[#EA580C] shrink-0">
                    {pdf.isSyllabus ? (
                      <ImageIcon className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">
                      {pdf.isSyllabus ? `Syllabus: ${pdf.originalName}` : pdf.originalName}
                    </CardTitle>
                    <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                      <div>Uploaded {formatDate(pdf.uploadDate)}</div>
                      <div>{formatFileSize(pdf.fileSize)}</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-center mb-1">
                    {pdf.hasRoadmap ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        Roadmap Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-600">
                        Not Generated
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full text-xs font-semibold rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
                    onClick={() => handleViewPDF(pdf)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View PDF
                  </Button>
                  <Button
                    className="w-full text-xs font-semibold rounded-xl bg-black text-white hover:bg-gray-900"
                    onClick={() => handleGenerateRoadmap(pdf)}
                    disabled={generatingPdfId === pdf.id}
                  >
                    {generatingPdfId === pdf.id ? (
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
                    className="w-full text-xs font-semibold rounded-xl"
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

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Study Material?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{pdfToDelete?.originalName}" and its roadmap. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePDF} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Layout>
    );
  }

  // Roadmap View
  if (!roadmap || !selectedPdf) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  const units = Object.keys(roadmap);
  const currentUnit = roadmap[selectedUnit] || {};
  const topics = Object.entries(currentUnit);

  return (
    <Layout>
      <div className="mb-6 mt-4">
        <Button variant="ghost" onClick={handleBackToList} className="mb-4 text-xs font-bold rounded-xl text-gray-500 hover:text-black">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Materials
        </Button>

        <Card className="mb-6 rounded-2xl border-gray-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{selectedPdf.originalName}</CardTitle>
                <CardDescription className="text-xs">Uploaded {formatDate(selectedPdf.uploadDate)}</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
                onClick={async () => {
                  if (!selectedPdf) return;
                  try {
                    setGeneratingPdfId(selectedPdf.id);
                    const response = await pdfApi.generateRoadmap(selectedPdf.id);
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
                    setGeneratingPdfId(null);
                  }
                }}
                disabled={generatingPdfId === selectedPdf?.id}
              >
                {generatingPdfId === selectedPdf?.id ? (
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
        <h1 className="mb-4 text-3xl font-bold text-gray-900">Study Roadmap</h1>
        <div className="flex items-center gap-4">
          <label className="text-xs font-bold text-gray-600">Select Unit:</label>
          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="w-48 rounded-xl border-gray-200 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {units.map((unit) => (
                <SelectItem key={unit} value={unit} className="text-xs">
                  Unit {parseInt(unit) + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 pb-20">
        {topics.map(([topicId, topic]: [string, RoadmapItem]) => (
          <Card
            key={topicId}
            className="border border-gray-100 rounded-2xl transition-all hover:shadow-md hover:border-[#EA580C]/30 cursor-pointer"
            onClick={() => navigate(`/library/${selectedPdf!.id}/topic/${selectedUnit}/${topicId}`, {
              state: {
                topicTitle: topic.title,
                topicSummary: topic.summary,
                restorePdfId: selectedPdf!.id,
                restoreUnitIndex: selectedUnit,
              }
            })}
          >
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">{topic.title}</CardTitle>
              <CardDescription className="text-xs text-gray-500">{topic.summary}</CardDescription>
            </CardHeader>
            {topic.links && Object.keys(topic.links).length > 0 && (
              <CardContent>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Video Resources:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(topic.links).map(([linkId, url]) => (
                      <Button
                        key={linkId}
                        variant="outline"
                        size="sm"
                        className="text-xs rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
                        asChild
                      >
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
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
    </Layout>
  );
};

export default RoadmapPage;
