import { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  ArrowLeft,
  RefreshCw,
  Image as ImageIcon,
  ChevronRight,
  Trash2,
  Eye,
  CheckCircle,
  Folder,
  FolderPlus,
  FolderOpen,
  Edit,
  Plus,
  Move,
  X,
  FileUp,
  Presentation,
  BookOpen,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { pdfApi, courseApi, coreApi, API_BASE_URL } from '@/lib/api';
import { PDF, Roadmap, RoadmapItem } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';
import { io } from 'socket.io-client';

const COURSE_COLORS = [
  { name: 'Orange', value: '#ea580c', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', hoverBg: 'hover:bg-orange-100/50' },
  { name: 'Blue', value: '#0284c7', bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', hoverBg: 'hover:bg-sky-100/50' },
  { name: 'Green', value: '#16a34a', bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', hoverBg: 'hover:bg-green-100/50' },
  { name: 'Purple', value: '#7c3aed', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', hoverBg: 'hover:bg-purple-100/50' },
  { name: 'Pink', value: '#db2777', bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', hoverBg: 'hover:bg-pink-100/50' },
  { name: 'Indigo', value: '#4f46e5', bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', hoverBg: 'hover:bg-indigo-100/50' },
];

const getCourseColorStyles = (colorHex: string) => {
  return COURSE_COLORS.find(c => c.value.toLowerCase() === colorHex.toLowerCase()) || COURSE_COLORS[0];
};

const RoadmapPage = () => {
  const [view, setView] = useState<'list' | 'roadmap'>('list');
  const [selectedPdf, setSelectedPdf] = useState<PDF | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState<PDF | null>(null);
  const navigate = useNavigate();

  // Course/Folder state variables
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [presentations, setPresentations] = useState<any[]>([]);
  const [loadingPresentations, setLoadingPresentations] = useState(false);
  const [questionBanks, setQuestionBanks] = useState<any[]>([]);
  const [loadingQuestionBanks, setLoadingQuestionBanks] = useState(false);
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<any | null>(null);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseColor, setNewCourseColor] = useState('#ea580c');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [pdfToAssign, setPdfToAssign] = useState<PDF | null>(null);
  const [targetCourseId, setTargetCourseId] = useState<string>('unassigned');

  // Direct upload states
  const [directPdfUploading, setDirectPdfUploading] = useState(false);
  const [directImgUploading, setDirectImgUploading] = useState(false);

  // Zustand Store
  const { files, setFiles, updateRoadmapStatus, updateVectorStatus, loading, setLoading } = useLibraryStore();

  useEffect(() => {
    fetchPDFs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch presentations & question banks when course changes
  useEffect(() => {
    if (selectedCourseId) {
      const fetchCourseAssets = async () => {
        try {
          setLoadingPresentations(true);
          setLoadingQuestionBanks(true);
          const [presRes, qbRes] = await Promise.all([
            courseApi.listPresentations(selectedCourseId),
            courseApi.listQuestionBanks(selectedCourseId)
          ]);
          setPresentations(presRes.data || []);
          setQuestionBanks(qbRes.data || []);
        } catch (error) {
          console.error("Failed to load course presentations or question banks:", error);
        } finally {
          setLoadingPresentations(false);
          setLoadingQuestionBanks(false);
        }
      };
      fetchCourseAssets();
    } else {
      setPresentations([]);
      setQuestionBanks([]);
    }
  }, [selectedCourseId]);

  // Restore roadmap view when navigating back from TopicDetail
  useEffect(() => {
    const restorePdfId = sessionStorage.getItem('roadmap_restore_pdfId');
    if (restorePdfId && files.length > 0) {
      sessionStorage.removeItem('roadmap_restore_pdfId');
      sessionStorage.removeItem('roadmap_restore_unit');
      const pdf = files.find(p => p.id === restorePdfId);
      if (pdf) handleGenerateRoadmap(pdf);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // Check for 'generate' query parameter to auto-start generation
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const generateId = queryParams.get('generate');
    if (generateId && files.length > 0) {
      const pdf = files.find(p => p.id === generateId);
      if (pdf) {
        navigate('/library', { replace: true });
        handleGenerateRoadmap(pdf);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, navigate]);

  // Socket.io integration to listen for PDF generation updates
  useEffect(() => {
    const activePdfIds = files
      .filter((pdf) => 
        (pdf.roadmapStatus !== "ready" && pdf.roadmapStatus !== "failed") ||
        (pdf.vectorStatus !== "ready" && pdf.vectorStatus !== "failed" && pdf.vectorStatus !== "na")
      )
      .map((pdf) => pdf.id);

    if (activePdfIds.length === 0) return;

    // Connect to WebSocket server
    const socket = io(API_BASE_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("Socket connected, joining rooms:", activePdfIds);
      activePdfIds.forEach((pdfId) => {
        socket.emit("join", pdfId);
      });
    });

    socket.on("pdf:roadmap:processing", (payload: any) => {
      console.log("Roadmap status update:", payload);
      updateRoadmapStatus(payload.pdfId, payload.status);
    });

    socket.on("pdf:roadmap:ready", (payload: any) => {
      console.log("Roadmap ready update:", payload);
      updateRoadmapStatus(payload.pdfId, "ready");
      if (selectedPdf && selectedPdf.id === payload.pdfId) {
        setRoadmap(payload.roadmap);
      }
    });

    socket.on("pdf:roadmap:failed", (payload: any) => {
      console.log("Roadmap failed update:", payload);
      updateRoadmapStatus(payload.pdfId, "failed");
    });

    socket.on("pdf:vector:processing", (payload: any) => {
      console.log("Vector status update:", payload);
      updateVectorStatus(payload.pdfId, payload.status);
    });

    socket.on("pdf:vector:ready", (payload: any) => {
      console.log("Vector ready update:", payload);
      updateVectorStatus(payload.pdfId, "ready");
    });

    socket.on("pdf:vector:failed", (payload: any) => {
      console.log("Vector failed update:", payload);
      updateVectorStatus(payload.pdfId, "failed");
    });

    const handleReconnect = async () => {
      console.log("Socket reconnected, syncing job states...");
      for (const pdfId of activePdfIds) {
        try {
          const res = await pdfApi.getStatus(pdfId);
          if (res.data) {
            updateRoadmapStatus(pdfId, res.data.roadmapStatus);
            updateVectorStatus(pdfId, res.data.vectorStatus);
          }
        } catch (err) {
          console.error("Failed to sync status for PDF:", pdfId, err);
        }
      }
    };

    socket.on("reconnect", handleReconnect);

    return () => {
      socket.disconnect();
    };
  }, [files, updateRoadmapStatus, updateVectorStatus, selectedPdf]);

  const fetchPDFs = async () => {
    try {
      setLoading(true);
      const [pdfRes, courseRes] = await Promise.all([
        pdfApi.listPDFs(),
        courseApi.listCourses()
      ]);
      setFiles(pdfRes.data as any);
      setCourses(courseRes.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load library data',
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

  const handleGenerateRoadmap = async (pdf: PDF) => {
    try {
      setGeneratingPdfId(pdf.id);
      setSelectedPdf(pdf);
      
      const response = await pdfApi.getRoadmapForPDF(pdf.id);
      
      // If document is not generated yet, handle 202 state
      if (response.status === 202 || (response.data as any).status) {
        toast({
          title: 'Roadmap Processing',
          description: `Roadmap is currently ${response.data.status || 'queued'}. Please wait a moment.`,
        });
        setSelectedPdf(null);
        return;
      }

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
      setSelectedPdf(null);
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleRetryRoadmap = async (pdfId: string) => {
    try {
      setGeneratingPdfId(pdfId);
      await pdfApi.generateRoadmap(pdfId);
      updateRoadmapStatus(pdfId, "queued");
      const isPdf = files.find(f => f.id === pdfId)?.isSyllabus === false;
      if (isPdf) {
        updateVectorStatus(pdfId, "queued");
      }
      toast({
        title: 'Success',
        description: 'Roadmap generation re-queued successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to re-queue roadmap job',
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
      setFiles(files.filter(p => p.id !== pdfToDelete.id));
      toast({ title: 'Success', description: 'PDF deleted successfully' });
      setDeleteDialogOpen(false);
      setPdfToDelete(null);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete PDF', variant: 'destructive' });
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
  };

  // Course & upload helper functions
  const handleCreateCourse = async () => {
    if (!newCourseName.trim()) {
      toast({ title: 'Validation Error', description: 'Course name is required', variant: 'destructive' });
      return;
    }
    try {
      await courseApi.createCourse({
        name: newCourseName,
        description: newCourseDesc,
        color: newCourseColor
      });
      toast({ title: 'Success', description: 'Course folder created successfully' });
      setCreateCourseOpen(false);
      setNewCourseName('');
      setNewCourseDesc('');
      setNewCourseColor('#ea580c');
      await fetchPDFs();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create course folder', variant: 'destructive' });
    }
  };

  const handleUpdateCourse = async () => {
    if (!courseToEdit) return;
    if (!newCourseName.trim()) {
      toast({ title: 'Validation Error', description: 'Course name is required', variant: 'destructive' });
      return;
    }
    try {
      await courseApi.updateCourse(courseToEdit._id, {
        name: newCourseName,
        description: newCourseDesc,
        color: newCourseColor
      });
      toast({ title: 'Success', description: 'Course folder updated successfully' });
      setEditCourseOpen(false);
      setCourseToEdit(null);
      setNewCourseName('');
      setNewCourseDesc('');
      await fetchPDFs();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update course folder', variant: 'destructive' });
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm("Are you sure you want to delete this course folder? Materials inside will not be deleted, they will be moved to 'Unassigned Materials'.")) {
      return;
    }
    try {
      await courseApi.deleteCourse(courseId);
      toast({ title: 'Success', description: 'Course folder deleted successfully' });
      setSelectedCourseId(null);
      await fetchPDFs();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete course folder', variant: 'destructive' });
    }
  };

  const handleMoveFile = async () => {
    if (!pdfToAssign) return;
    try {
      const courseVal = targetCourseId === 'unassigned' ? null : targetCourseId;
      await pdfApi.assignFileToCourse(pdfToAssign.id, courseVal);
      setAssignDialogOpen(false);
      setPdfToAssign(null);
      await fetchPDFs();
      // Navigate to the destination folder so the user sees the file there
      setSelectedCourseId(targetCourseId);
      toast({ title: 'Success', description: `Material moved to ${targetCourseId === 'unassigned' ? 'Unassigned Materials' : courses.find(c => c._id === targetCourseId)?.name || 'course'}` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to move material', variant: 'destructive' });
    }
  };

  const handleDirectPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDirectPdfUploading(true);
    try {
      const actualCourseId = selectedCourseId === 'unassigned' ? null : selectedCourseId;
      await pdfApi.uploadPDF(file, actualCourseId);
      toast({
        title: 'Success',
        description: `PDF "${file.name}" uploaded successfully. Roadmap generation queued.`,
      });
      e.target.value = '';
      await fetchPDFs();
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload PDF',
        variant: 'destructive',
      });
    } finally {
      setDirectPdfUploading(false);
    }
  };

  const handleDirectImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDirectImgUploading(true);
    try {
      const actualCourseId = selectedCourseId === 'unassigned' ? null : selectedCourseId;
      await coreApi.parseImg(file, actualCourseId);
      toast({
        title: 'Success',
        description: `Image syllabus "${file.name}" uploaded and queued for processing.`,
      });
      e.target.value = '';
      await fetchPDFs();
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image syllabus',
        variant: 'destructive',
      });
    } finally {
      setDirectImgUploading(false);
    }
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

  // Group files by type (PDFs vs Images)
  const pdfFiles = files.filter((f) => !f.isSyllabus);
  const imageFiles = files.filter((f) => f.isSyllabus);

  // Flat CSS styles for Framer Motion replacement
  const animationStyle = (
    <style>{`
      @keyframes fadeInScale {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      .animate-fade-in-scale {
        animation: fadeInScale 0.25s ease-out forwards;
      }
    `}</style>
  );

  // ─── PDF LIST VIEW ───────────────────────────────────────────
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

    if (files.length === 0 && courses.length === 0) {
      return (
        <Layout>
          {animationStyle}
          <div className="flex h-[400px] flex-col items-center justify-center text-center mt-12 max-w-md mx-auto animate-fade-in-scale">
            <div className="h-16 w-16 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-6">
              <Folder className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-2xl font-bold">Your Library is Empty</h2>
            <p className="mb-6 text-muted-foreground text-sm">Create a course folder to organize your subjects, or upload a syllabus image to generate unit plans.</p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                onClick={() => {
                  setNewCourseName('');
                  setNewCourseDesc('');
                  setNewCourseColor('#ea580c');
                  setCreateCourseOpen(true);
                }}
                className="flex-1 bg-black text-white hover:bg-gray-900 rounded-xl py-5 font-semibold text-xs"
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Course Folder
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/syllabus')}
                className="flex-1 rounded-xl border-gray-200 py-5 font-semibold text-xs"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Syllabus
              </Button>
            </div>
          </div>
          
          {/* Dialog: Create Course (Fallback empty state) */}
          <Dialog open={createCourseOpen} onOpenChange={setCreateCourseOpen}>
            <DialogContent className="rounded-2xl sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Course Folder</DialogTitle>
                <DialogDescription>
                  Organize your study materials into course folder subjects.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="course-name">Folder Name</Label>
                  <Input
                    id="course-name"
                    placeholder="e.g. Computer Architecture"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="course-desc">Description (Optional)</Label>
                  <Textarea
                    id="course-desc"
                    placeholder="Brief description of the course..."
                    value={newCourseDesc}
                    onChange={(e) => setNewCourseDesc(e.target.value)}
                    className="rounded-xl min-h-[80px]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Theme Color</Label>
                  <div className="flex gap-3 mt-1">
                    {COURSE_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        className={`h-7 w-7 rounded-full border-2 transition-all ${
                          newCourseColor === c.value ? 'border-black scale-110 shadow-sm' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c.value }}
                        onClick={() => setNewCourseColor(c.value)}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateCourseOpen(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleCreateCourse} className="rounded-xl bg-black text-white hover:bg-gray-900">Create Folder</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Layout>
      );
    }

    return (
      <Layout>
        {animationStyle}
        
        {/* Main list view router */}
        {selectedCourseId === null ? (
          <div className="animate-fade-in-scale">
            <div className="flex items-center justify-between mb-8 mt-4">
              <div>
                <h1 className="text-3xl font-bold">My Study Library</h1>
                <p className="text-muted-foreground text-sm mt-1">Group your study materials into folders by course subject.</p>
              </div>
              <Button
                onClick={() => {
                  setNewCourseName('');
                  setNewCourseDesc('');
                  setNewCourseColor('#ea580c');
                  setCreateCourseOpen(true);
                }}
                className="bg-black text-white hover:bg-gray-900 rounded-xl px-4 py-2 text-xs font-semibold"
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Course Folder
              </Button>
            </div>

            {/* Course Folders Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => {
                const colorStyles = getCourseColorStyles(course.color);
                const courseFiles = files.filter(f => f.courseId?.toString() === course._id?.toString());
                return (
                  <div
                    key={course._id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer overflow-hidden"
                    onClick={() => setSelectedCourseId(course._id)}
                  >
                    {/* Color accent bar at the top */}
                    <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: course.color }} />
                    
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorStyles.bg} ${colorStyles.text}`}>
                          <FolderOpen className="h-6 w-6" />
                        </div>
                        
                        {/* Quick settings/edit button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-gray-400 hover:text-gray-900"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCourseToEdit(course);
                            setNewCourseName(course.name);
                            setNewCourseDesc(course.description || '');
                            setNewCourseColor(course.color);
                            setEditCourseOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-black line-clamp-1">{course.name}</h3>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2 h-8">{course.description || 'No description provided.'}</p>
                    </div>
                    
                    <div className="mt-6 flex items-center justify-between border-t border-gray-50 pt-4 text-xs font-semibold text-gray-500">
                      <span>{courseFiles.length} {courseFiles.length === 1 ? 'material' : 'materials'}</span>
                      <span className={`inline-flex items-center gap-1 text-[11px] ${colorStyles.text}`}>Open Workspace <ChevronRight className="h-3 w-3" /></span>
                    </div>
                  </div>
                );
              })}

              {/* Unassigned materials folder card */}
              {(() => {
                const unassignedFiles = files.filter(f => !f.courseId);
                return (
                  <div
                    className="group relative flex flex-col justify-between rounded-2xl border border-dashed border-gray-200 bg-gray-50/30 p-6 shadow-none transition-all duration-300 hover:border-gray-300 hover:shadow-sm cursor-pointer overflow-hidden"
                    onClick={() => setSelectedCourseId('unassigned')}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-300" />
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                          <Folder className="h-6 w-6" />
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Unassigned Materials</h3>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2 h-8">General files not associated with any course folder.</p>
                    </div>
                    
                    <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-xs font-semibold text-gray-500">
                      <span>{unassignedFiles.length} {unassignedFiles.length === 1 ? 'material' : 'materials'}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-700">Open Folder <ChevronRight className="h-3 w-3" /></span>
                    </div>
                  </div>
                );
              })()}

              {/* Add new Course Folder card */}
              <div
                className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white p-6 transition-all duration-300 hover:border-black/30 hover:bg-gray-50/20 cursor-pointer text-center min-h-[200px]"
                onClick={() => {
                  setNewCourseName('');
                  setNewCourseDesc('');
                  setNewCourseColor('#ea580c');
                  setCreateCourseOpen(true);
                }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400 group-hover:bg-black/5 group-hover:text-gray-900 transition-colors mb-3">
                  <FolderPlus className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-700 group-hover:text-black">Create Course Folder</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Group study materials by subject or course</p>
              </div>
            </div>
          </div>
        ) : (
          /* Course detail workspace view */
          <div className="animate-fade-in-scale">
            <Button
              variant="ghost"
              onClick={() => setSelectedCourseId(null)}
              className="mb-4 text-xs font-bold rounded-xl text-gray-500 hover:text-black px-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Folders
            </Button>

            {(() => {
              const isUnassigned = selectedCourseId === 'unassigned';
              const currentCourse = isUnassigned ? null : courses.find(c => c._id === selectedCourseId);
              const colorStyles = currentCourse ? getCourseColorStyles(currentCourse.color) : { text: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' };
              
              const coursePdfs = files.filter(f => isUnassigned ? !f.courseId : f.courseId?.toString() === selectedCourseId?.toString());
              const coursePdfFiles = coursePdfs.filter(f => !f.isSyllabus);
              const courseImageFiles = coursePdfs.filter(f => f.isSyllabus);
              
              return (
                <div className="space-y-6">
                  {/* Course Header Banner */}
                  <div className={`relative rounded-2xl border ${currentCourse ? colorStyles.border : 'border-gray-200'} bg-white p-6 shadow-sm overflow-hidden`}>
                    {currentCourse && (
                      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: currentCourse.color }} />
                    )}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center justify-center rounded-lg p-2 ${colorStyles.bg} ${colorStyles.text}`}>
                            {isUnassigned ? <Folder className="h-5 w-5" /> : <FolderOpen className="h-5 w-5" />}
                          </span>
                          <h1 className="text-2xl font-bold text-gray-900">{isUnassigned ? 'Unassigned Materials' : currentCourse?.name}</h1>
                        </div>
                        <p className="text-sm text-gray-500 mt-2 ml-10">
                          {isUnassigned ? 'General uploaded materials not yet assigned to any course.' : currentCourse?.description || 'No description provided.'}
                        </p>
                      </div>
                      
                      {!isUnassigned && currentCourse && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs font-semibold rounded-xl"
                            onClick={() => {
                              setCourseToEdit(currentCourse);
                              setNewCourseName(currentCourse.name);
                              setNewCourseDesc(currentCourse.description || '');
                              setNewCourseColor(currentCourse.color);
                              setEditCourseOpen(true);
                            }}
                          >
                            <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Folder
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="text-xs font-semibold rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                            onClick={() => handleDeleteCourse(currentCourse._id)}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Folder
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Direct Add Materials Box */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-900">Directly Add Notes (PDF)</h3>
                        <span className="text-[10px] text-gray-400">Roadmap will auto-generate</span>
                      </div>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf"
                          id="direct-pdf-upload"
                          className="hidden"
                          disabled={directPdfUploading}
                          onChange={handleDirectPdfUpload}
                        />
                        <label
                          htmlFor="direct-pdf-upload"
                          className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 p-6 text-center cursor-pointer transition-all hover:bg-gray-50/50 ${
                            directPdfUploading ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          {directPdfUploading ? (
                            <>
                              <RefreshCw className="h-8 w-8 text-orange-500 animate-spin mb-2" />
                              <span className="text-xs font-bold text-gray-700">Uploading note...</span>
                            </>
                          ) : (
                            <>
                              <FileUp className="h-8 w-8 text-gray-400 mb-2" />
                              <span className="text-xs font-bold text-gray-700">Click to upload lecture notes PDF</span>
                              <span className="text-[10px] text-gray-400 mt-1">Files are queued for vector knowledge base</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-900">Directly Add Syllabus (Image)</h3>
                        <span className="text-[10px] text-gray-400">OCR text structure extraction</span>
                      </div>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          id="direct-img-upload"
                          className="hidden"
                          disabled={directImgUploading}
                          onChange={handleDirectImgUpload}
                        />
                        <label
                          htmlFor="direct-img-upload"
                          className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 p-6 text-center cursor-pointer transition-all hover:bg-gray-50/50 ${
                            directImgUploading ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          {directImgUploading ? (
                            <>
                              <RefreshCw className="h-8 w-8 text-orange-500 animate-spin mb-2" />
                              <span className="text-xs font-bold text-gray-700">Extracting syllabus...</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                              <span className="text-xs font-bold text-gray-700">Click to upload syllabus image</span>
                              <span className="text-[10px] text-gray-400 mt-1">Supported formats: JPG, JPEG, PNG</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Materials List */}
                  <div className="space-y-6 pb-20">
                    {coursePdfs.length === 0 && presentations.length === 0 ? (
                      <div className="text-center py-12 rounded-2xl border border-dashed border-gray-100 bg-white">
                        <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <h3 className="text-sm font-bold text-gray-900">No materials inside this course yet</h3>
                        <p className="text-xs text-gray-400 mt-1">Upload lecture notes above to begin or move other materials here.</p>
                      </div>
                    ) : (
                      <>
                        {/* PDFs section */}
                        {coursePdfFiles.length > 0 && (
                          <div>
                            <div className="flex items-center gap-3 mb-4 mt-6 first:mt-0">
                              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">
                                Lecture Notes (PDFs)
                              </span>
                              <div className="flex-1 h-px bg-gray-100" />
                            </div>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                              {coursePdfFiles.map((pdf) => (
                                <div key={pdf.id} className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                                  <div className="flex items-start gap-3 mb-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA580C]/10 text-[#EA580C] shrink-0">
                                      <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 truncate">
                                        {pdf.originalName}
                                      </p>
                                      <p className="text-xs text-gray-400 mt-0.5">Uploaded {formatDate(pdf.uploadDate)} · {formatFileSize(pdf.fileSize)}</p>
                                    </div>
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    <Button
                                      variant="outline"
                                      className="w-full text-xs font-semibold rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
                                      onClick={() => handleViewPDF(pdf as any)}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      View PDF
                                    </Button>

                                    {/* Roadmap Button State */}
                                    {pdf.roadmapStatus === "not_started" || pdf.roadmapStatus === "queued" ? (
                                      <Button disabled variant="outline" className="w-full text-xs font-semibold rounded-xl border-gray-200 text-gray-400 bg-gray-50">
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />Roadmap Queued
                                      </Button>
                                    ) : pdf.roadmapStatus === "processing" ? (
                                      <Button disabled variant="outline" className="w-full text-xs font-semibold rounded-xl border-gray-200 text-gray-400 bg-gray-50">
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />Generating Roadmap...
                                      </Button>
                                    ) : pdf.roadmapStatus === "ready" ? (
                                      <Button
                                        className="w-full text-xs font-semibold rounded-xl bg-black text-white hover:bg-gray-900 animate-fade-in-scale"
                                        onClick={() => handleGenerateRoadmap(pdf as any)}
                                      >
                                        View Roadmap →
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        className="w-full text-xs font-semibold rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                                        onClick={() => handleRetryRoadmap(pdf.id)}
                                        disabled={generatingPdfId === pdf.id}
                                      >
                                        {generatingPdfId === pdf.id ? (
                                          <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Retrying...</>
                                        ) : (
                                          <>Roadmap Failed ↺</>
                                        )}
                                      </Button>
                                    )}

                                    {/* Vector/Doubt Solver Button State */}
                                    {pdf.vectorStatus === "not_started" || pdf.vectorStatus === "queued" ? (
                                      <Button disabled variant="outline" className="w-full text-xs font-semibold rounded-xl border-gray-200 text-gray-400 bg-gray-50">
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />Doubt Solver Queued
                                      </Button>
                                    ) : pdf.vectorStatus === "processing" ? (
                                      <Button disabled variant="outline" className="w-full text-xs font-semibold rounded-xl border-gray-200 text-gray-400 bg-gray-50">
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />Building Knowledge Base...
                                      </Button>
                                    ) : pdf.vectorStatus === "ready" ? (
                                      <Button
                                        className="w-full text-xs font-semibold rounded-xl bg-[#EA580C] text-white hover:bg-[#D97706] animate-fade-in-scale"
                                        onClick={() => navigate(`/library/${pdf.id}/doubt`, { state: { filename: pdf.originalName } })}
                                      >
                                        Ask Doubt →
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        className="w-full text-xs font-semibold rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                                        onClick={() => handleRetryRoadmap(pdf.id)}
                                        disabled={generatingPdfId === pdf.id}
                                      >
                                        {generatingPdfId === pdf.id ? (
                                          <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Retrying...</>
                                        ) : (
                                          <>Doubt Solver Failed ↺</>
                                        )}
                                      </Button>
                                    )}

                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        className="flex-1 text-xs font-semibold rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
                                        onClick={() => {
                                          setPdfToAssign(pdf as any);
                                          setTargetCourseId(pdf.courseId || 'unassigned');
                                          setAssignDialogOpen(true);
                                        }}
                                      >
                                        <Move className="mr-1.5 h-3.5 w-3.5" /> Move
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        className="flex-1 text-xs font-semibold rounded-xl"
                                        onClick={() => openDeleteDialog(pdf as any)}
                                      >
                                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Images section */}
                        {courseImageFiles.length > 0 && (
                          <div>
                            <div className="flex items-center gap-3 mb-4 mt-6 first:mt-0">
                              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">
                                Syllabi (Images)
                              </span>
                              <div className="flex-1 h-px bg-gray-100" />
                            </div>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                              {courseImageFiles.map((pdf) => (
                                <div key={pdf.id} className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                                  <div className="flex items-start gap-3 mb-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA580C]/10 text-[#EA580C] shrink-0">
                                      <ImageIcon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 truncate">
                                        Syllabus: {pdf.originalName}
                                      </p>
                                      <p className="text-xs text-gray-400 mt-0.5">Uploaded {formatDate(pdf.uploadDate)} · {formatFileSize(pdf.fileSize)}</p>
                                    </div>
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    <Button
                                      variant="outline"
                                      className="w-full text-xs font-semibold rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
                                      onClick={() => handleViewPDF(pdf as any)}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      View PDF
                                    </Button>

                                    {/* Image Syllabus Roadmap State */}
                                    {pdf.roadmapStatus === "not_started" || pdf.roadmapStatus === "queued" ? (
                                      <Button disabled variant="outline" className="w-full text-xs font-semibold rounded-xl border-gray-200 text-gray-400 bg-gray-50">
                                        Syllabus Queued
                                      </Button>
                                    ) : pdf.roadmapStatus === "processing" ? (
                                      <Button disabled variant="outline" className="w-full text-xs font-semibold rounded-xl border-gray-200 text-gray-400 bg-gray-50">
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />Processing...
                                      </Button>
                                    ) : pdf.roadmapStatus === "ready" ? (
                                      <Button
                                        className="w-full text-xs font-semibold rounded-xl bg-black text-white hover:bg-gray-900 animate-fade-in-scale"
                                        onClick={() => handleGenerateRoadmap(pdf as any)}
                                      >
                                        View Syllabus →
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        className="w-full text-xs font-semibold rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                                        onClick={() => handleRetryRoadmap(pdf.id)}
                                        disabled={generatingPdfId === pdf.id}
                                      >
                                        {generatingPdfId === pdf.id ? (
                                          <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Retrying...</>
                                        ) : (
                                          <>Failed ↺</>
                                        )}
                                      </Button>
                                    )}

                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        className="flex-1 text-xs font-semibold rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
                                        onClick={() => {
                                          setPdfToAssign(pdf as any);
                                          setTargetCourseId(pdf.courseId || 'unassigned');
                                          setAssignDialogOpen(true);
                                        }}
                                      >
                                        <Move className="mr-1.5 h-3.5 w-3.5" /> Move
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        className="flex-1 text-xs font-semibold rounded-xl"
                                        onClick={() => openDeleteDialog(pdf as any)}
                                      >
                                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* PPT Corner section */}
                        {presentations.length > 0 && (
                          <div>
                            <div className="flex items-center gap-3 mb-4 mt-8">
                              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">
                                PPT Corner (Presentations)
                              </span>
                              <div className="flex-1 h-px bg-gray-100" />
                            </div>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                              {presentations.map((pres) => (
                                <div key={pres._id} className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-start gap-3 mb-4">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-[#EA580C] shrink-0">
                                        <Presentation className="h-5 w-5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                          {pres.metadata?.title || 'Lecture Presentation'}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                          {pres.metadata?.slideCount || pres.slides?.length || 0} Slides · Subject: {pres.metadata?.subject || 'General'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col gap-2 mt-2">
                                    <Button
                                      className="w-full text-xs font-semibold rounded-xl bg-black text-white hover:bg-gray-900"
                                      onClick={() => navigate(`/toolkit/slide-generator?id=${pres._id}`)}
                                    >
                                      View Presentation Slides →
                                    </Button>
                                    <p className="text-[10px] text-gray-400 text-center">
                                      Generated {new Date(pres.createdAt || pres.metadata?.generatedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Question Bank Corner section */}
                        {questionBanks.length > 0 && (
                          <div>
                            <div className="flex items-center gap-3 mb-4 mt-8">
                              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">
                                Question Bank Corner (Question Banks)
                              </span>
                              <div className="flex-1 h-px bg-gray-100" />
                            </div>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                              {questionBanks.map((qb) => (
                                <div key={qb._id} className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-start gap-3 mb-4">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-[#EA580C] shrink-0">
                                        <BookOpen className="h-5 w-5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                          {qb.metadata?.title || 'Question Bank'}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                          {qb.metadata?.questionCount || qb.questions?.length || 0} Questions · Subject: {qb.metadata?.subject || 'General'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col gap-2 mt-2">
                                    <Button
                                      className="w-full text-xs font-semibold rounded-xl bg-black text-white hover:bg-gray-900"
                                      onClick={() => navigate(`/toolkit/question-bank?id=${qb._id}`)}
                                    >
                                      View Question Bank →
                                    </Button>
                                    <p className="text-[10px] text-gray-400 text-center">
                                      Generated {new Date(qb.createdAt || qb.metadata?.generatedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {presentations.length === 0 && coursePdfFiles.length > 0 && (
                          <div className="rounded-2xl border border-dashed border-gray-100 bg-gray-50/20 p-5 text-center mt-6">
                            <Presentation className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                            <h4 className="text-xs font-bold text-gray-700">Need slides for this course?</h4>
                            <p className="text-[11px] text-gray-400 mt-0.5 mb-3">Generate editable PowerPoint decks automatically using your PDFs.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs font-semibold rounded-xl border-gray-200"
                              onClick={() => navigate('/toolkit/slide-generator')}
                            >
                              Open AI Slide Generator
                            </Button>
                          </div>
                        )}

                        {questionBanks.length === 0 && coursePdfFiles.length > 0 && (
                          <div className="rounded-2xl border border-dashed border-gray-100 bg-gray-50/20 p-5 text-center mt-6">
                            <BookOpen className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                            <h4 className="text-xs font-bold text-gray-700">Need a Question Bank for this course?</h4>
                            <p className="text-[11px] text-gray-400 mt-0.5 mb-3">Generate custom MCQs, short and long answers using your PDFs.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs font-semibold rounded-xl border-gray-200"
                              onClick={() => navigate('/toolkit/question-bank')}
                            >
                              Open AI Question Bank Generator
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Dialog: Create Course */}
        <Dialog open={createCourseOpen} onOpenChange={setCreateCourseOpen}>
          <DialogContent className="rounded-2xl sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Course Folder</DialogTitle>
              <DialogDescription>
                Organize your study materials into course folder subjects.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="course-name">Folder Name</Label>
                <Input
                  id="course-name"
                  placeholder="e.g. Computer Architecture"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="course-desc">Description (Optional)</Label>
                <Textarea
                  id="course-desc"
                  placeholder="Brief description of the course..."
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  className="rounded-xl min-h-[80px]"
                />
              </div>
              <div className="grid gap-2">
                <Label>Theme Color</Label>
                <div className="flex gap-3 mt-1">
                  {COURSE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        newCourseColor === c.value ? 'border-black scale-110 shadow-sm' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setNewCourseColor(c.value)}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateCourseOpen(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleCreateCourse} className="rounded-xl bg-black text-white hover:bg-gray-900">Create Folder</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Edit Course */}
        <Dialog open={editCourseOpen} onOpenChange={setEditCourseOpen}>
          <DialogContent className="rounded-2xl sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Course Folder</DialogTitle>
              <DialogDescription>
                Update the name, description, or theme color of your folder.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-course-name">Folder Name</Label>
                <Input
                  id="edit-course-name"
                  placeholder="Folder Name"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-course-desc">Description (Optional)</Label>
                <Textarea
                  id="edit-course-desc"
                  placeholder="Folder description..."
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  className="rounded-xl min-h-[80px]"
                />
              </div>
              <div className="grid gap-2">
                <Label>Theme Color</Label>
                <div className="flex gap-3 mt-1">
                  {COURSE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        newCourseColor === c.value ? 'border-black scale-110 shadow-sm' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setNewCourseColor(c.value)}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditCourseOpen(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleUpdateCourse} className="rounded-xl bg-black text-white hover:bg-gray-900">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Move Material / Assign Course */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="rounded-2xl sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Move Study Material</DialogTitle>
              <DialogDescription>
                Select the target course folder for "{pdfToAssign?.originalName}".
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="target-course">Select Course Folder</Label>
                <Select value={targetCourseId} onValueChange={setTargetCourseId}>
                  <SelectTrigger id="target-course" className="rounded-xl">
                    <SelectValue placeholder="Choose a folder" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="unassigned">Unassigned Materials (General)</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course._id} value={course._id}>{course.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleMoveFile} className="rounded-xl bg-black text-white hover:bg-gray-900">Move Material</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

  // ─── ROADMAP VIEW ─────────────────────────────────────────────
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

  const allTopics = units.flatMap((unitKey) => {
    const unit = roadmap[unitKey] || {};
    return Object.entries(unit).map(([topicId, topic]) => ({
      unitKey,
      unitLabel: `Unit ${parseInt(unitKey) + 1}`,
      topicId,
      topic: topic as RoadmapItem,
    }));
  });

  const totalUnits = units.length;
  const totalTopics = allTopics.length;

  return (
    <Layout>
      <div className="mb-6 mt-4">
        <Button variant="ghost" onClick={handleBackToList} className="mb-4 text-xs font-bold rounded-xl text-gray-500 hover:text-black">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Materials
        </Button>

        {/* Minimal file info bar */}
        <div className="mb-6 flex items-center justify-between rounded-xl bg-gray-50 px-5 py-4">
          <div>
            <p className="text-[15px] font-semibold text-gray-900">{selectedPdf.originalName}</p>
            <p className="text-xs text-gray-400 mt-0.5">Uploaded {formatDate(selectedPdf.uploadDate)}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
            onClick={async () => {
              if (!selectedPdf) return;
              handleRetryRoadmap(selectedPdf.id);
            }}
            disabled={generatingPdfId === selectedPdf?.id}
          >
            {generatingPdfId === selectedPdf?.id ? (
              <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Regenerating...</>
            ) : (
              <><RefreshCw className="mr-2 h-4 w-4" />Regenerate</>
            )}
          </Button>
        </div>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{selectedPdf.originalName}</h1>
          <p className="mt-1 text-sm text-gray-400">{totalTopics} topics across {totalUnits} unit{totalUnits !== 1 ? 's' : ''}</p>
        </div>

        {/* Flat topic list grouped by unit */}
        <div className="pb-20 space-y-1">
          {units.map((unitKey) => {
            const unitTopics = allTopics.filter(t => t.unitKey === unitKey);
            if (unitTopics.length === 0) return null;
            const unitLabel = `Unit ${parseInt(unitKey) + 1}`;

            return (
              <div key={unitKey}>
                {/* Unit group header */}
                <div className="flex items-center justify-between gap-3 mb-3 mt-6 first:mt-0">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">
                      {unitLabel}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                      {unitTopics.filter(t => t.topic.studied).length} / {unitTopics.length} Studied
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Topic cards */}
                <div className="space-y-3">
                  {unitTopics.map(({ topicId, topic, unitKey: uk }) => {
                    const isStudied = !!topic.studied;
                    return (
                      <div
                        key={topicId}
                        className={`group flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm border cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${
                          isStudied ? "border-green-100 bg-green-50/10" : "border-gray-100"
                        }`}
                        onClick={() =>
                          navigate(`/library/${selectedPdf!.id}/topic/${uk}/${topicId}`, {
                            state: {
                              topicTitle: topic.title,
                              topicSummary: topic.summary,
                              restorePdfId: selectedPdf!.id,
                              restoreUnitIndex: uk,
                              roadmapUnits: roadmap,
                            },
                          })
                        }
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                              {unitLabel}
                            </span>
                            {isStudied && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 animate-fade-in-scale">
                                <CheckCircle className="h-3 w-3 fill-green-700 text-white" />
                                Studied
                              </span>
                            )}
                          </div>
                          <p className={`text-[16px] font-bold leading-snug transition-colors ${isStudied ? "text-green-800" : "text-gray-900"}`}>{topic.title}</p>
                          {topic.summary && (
                            <p className="mt-1 text-[13px] text-gray-400 line-clamp-2">{topic.summary}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <ChevronRight className={`h-5 w-5 group-hover:text-gray-500 transition-colors ${isStudied ? "text-green-400" : "text-gray-300"}`} />
                          <span className={`text-[11px] font-semibold ${isStudied ? "text-green-600" : "text-gray-300"}`}>
                            {isStudied ? "Review" : "Study"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default RoadmapPage;
