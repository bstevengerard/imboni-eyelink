import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Eye, Book, Video, FileText, AlertTriangle, CheckCircle,
  Lightbulb, Heart, Baby, Glasses, Sun, Monitor
} from "lucide-react";
import educationImage from "@/assets/61514.jpg";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type EducationItem = {
  _id: string;
  content_type: "topic" | "myth" | "symptom";
  title?: string;
  description?: string;
  icon?: string;
  articles?: string[];
  myth_text?: string;
  fact_text?: string;
  symptom_text?: string;
  order: number;
  is_published: boolean;
};

const iconMap: Record<string, React.ElementType> = {
  Eye,
  Book,
  Video,
  FileText,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Heart,
  Baby,
  Glasses,
  Sun,
  Monitor,
};

export default function EducationPage() {
  const [items, setItems] = useState<EducationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEducation = async () => {
      try {
        const res = await api.get<EducationItem[]>("/api/education");
        if (res.success && Array.isArray(res.data)) {
          setItems(res.data);
        }
      } catch {
        // silent fail for public page
      } finally {
        setLoading(false);
      }
    };
    fetchEducation();
  }, []);

  const topics = items.filter(i => i.content_type === "topic" && i.is_published);
  const myths = items.filter(i => i.content_type === "myth" && i.is_published);
  const symptoms = items.filter(i => i.content_type === "symptom" && i.is_published);

  const getIcon = (iconName?: string) => {
    const name = iconName || "BookOpen";
    return iconMap[name] || Book;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="absolute inset-0 z-0">
          <img
            src={educationImage}
            alt="Eye Health Education"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-accent/90" />
        </div>
        <div className="container relative z-10 text-white">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <Book className="w-10 h-10" />
              <span className="text-lg font-medium">Eye Health Education</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Learn About Your Eye Health
            </h1>
            <p className="text-xl text-white/90">
              Knowledge is the first step to prevention. Explore our educational resources
              to better understand and protect your vision.
            </p>
          </div>
        </div>
      </section>

      {/* Topics Grid */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Educational Topics</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore our comprehensive library of eye health information
            </p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-elevated p-6 animate-pulse">
                  <div className="w-14 h-14 rounded-2xl bg-muted mb-4" />
                  <div className="h-6 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-full mb-4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center py-16">
              <Book className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No educational topics available yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {topics.map((topic) => {
                const Icon = getIcon(topic.icon);
                return (
                  <div key={topic._id} className="card-elevated p-6 hover:shadow-lg transition-shadow">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{topic.title}</h3>
                    {topic.description && (
                      <p className="text-muted-foreground mb-4">{topic.description}</p>
                    )}
                    {topic.articles && topic.articles.length > 0 && (
                      <ul className="space-y-2">
                        {topic.articles.map((article) => {
                          const isUrl = article.startsWith('http://') || article.startsWith('https://');
                          return (
                            <li key={article} className="flex items-center gap-2 text-sm">
                              <FileText className="w-4 h-4 text-accent" />
                              {isUrl ? (
                                <a 
                                  href={article} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-accent hover:underline truncate"
                                >
                                  {new URL(article).pathname.split('/').pop() || article}
                                </a>
                              ) : (
                                <span className="truncate">{article}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Myth Busters */}
      {myths.length > 0 && (
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full mb-4">
                <Lightbulb className="w-5 h-5" />
                <span className="font-medium">Myth Busters</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Common Eye Myths Debunked</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Separate fact from fiction with our eye health myth-busting guide
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {myths.map((item) => (
                <div key={item._id} className="card-elevated p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-destructive">MYTH</span>
                      <p className="font-medium">{item.myth_text}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pl-8">
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-accent">FACT</span>
                      <p className="text-muted-foreground">{item.fact_text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Warning Signs */}
      {symptoms.length > 0 && (
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-full mb-4">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Important</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Warning Signs: When to See a Doctor
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Don't ignore these symptoms. Early detection and treatment can prevent
                  permanent vision loss and other serious complications.
                </p>
                <Button asChild size="lg">
                  <Link to="/register">Book an Eye Exam</Link>
                </Button>
              </div>
              <div className="card-elevated p-8">
                <h3 className="font-semibold text-lg mb-4">See a doctor if you experience:</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {symptoms.map((item) => (
                    <li key={item._id} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-destructive" />
                      <span>{item.symptom_text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Video Resources */}
      <section className="py-16 lg:py-24 bg-primary text-white">
        <div className="container text-center">
          <Video className="w-16 h-16 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Video Resources Coming Soon</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            We're creating educational videos in Kinyarwanda, English, and French to help
            you better understand eye health topics.
          </p>
          <Button asChild size="lg" className="btn-hero">
            <Link to="/contact">Get Notified</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}