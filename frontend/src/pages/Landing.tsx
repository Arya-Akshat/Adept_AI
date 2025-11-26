import { Link } from 'react-router-dom';
import { BookOpen, FileText, Map, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

import { useAuth } from '@/contexts/AuthContext';

const Landing = () => {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-background to-academic-light py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm font-medium text-accent">
                <Sparkles className="h-4 w-4" />
                AI-Powered Study Companion
              </div>
              <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl">
                Your Personal AI
                <span className="text-primary"> Study Companion</span>
              </h1>
              <p className="mb-8 text-lg text-muted-foreground md:text-xl">
                Transform your syllabus into personalized study roadmaps. Upload your materials and let
                AI generate comprehensive learning paths with curated resources.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                {user ? (
                  <Link to="/input-notes">
                    <Button size="lg" className="w-full sm:w-auto">
                      Go to Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/register">
                      <Button size="lg" className="w-full sm:w-auto">
                        Get Started Free
                      </Button>
                    </Link>
                    <Link to="/login">
                      <Button size="lg" variant="outline" className="w-full sm:w-auto">
                        Sign In
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-foreground">How ADEPT Works</h2>
              <p className="text-muted-foreground">
                Three simple steps to personalized learning
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <Card className="border-2 transition-shadow hover:shadow-lg">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">Upload Your Materials</h3>
                  <p className="text-muted-foreground">
                    Upload your syllabus as a PDF or image. Support for Google Classroom integration
                    coming soon.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 transition-shadow hover:shadow-lg">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">AI Processing</h3>
                  <p className="text-muted-foreground">
                    Our AI analyzes your syllabus and generates a comprehensive study plan with
                    relevant resources.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 transition-shadow hover:shadow-lg">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Map className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">Follow Your Roadmap</h3>
                  <p className="text-muted-foreground">
                    Access your personalized learning roadmap with topics, summaries, and curated
                    video resources.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary py-20 text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto max-w-2xl">
              <BookOpen className="mx-auto mb-6 h-16 w-16" />
              <h2 className="mb-4 text-3xl font-bold">Ready to Transform Your Learning?</h2>
              <p className="mb-8 text-lg opacity-90">
                Join students who are using AI to create personalized study plans and achieve their
                academic goals.
              </p>
              <Link to="/register">
                <Button size="lg" variant="secondary">
                  Start Learning Today
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Landing;
