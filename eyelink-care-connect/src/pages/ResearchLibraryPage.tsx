import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, FileText, Download, ExternalLink, BookOpen, Calendar, Loader2 } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type ResearchArticle = {
  _id: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  category: string;
  abstract: string;
  download_url: string | null;
  external_url: string | null;
  citations: number;
  is_published: boolean;
  createdAt: string;
};

export default function ResearchLibraryPage() {
  const [articles, setArticles] = useState<ResearchArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await api.get<ResearchArticle[]>("/api/research");
      if (res.success && Array.isArray(res.data)) {
        setArticles(res.data);
      }
    } catch {
      // silent fail for public page
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(articles.map((a) => a.category));
    return ["All", ...Array.from(cats).sort()];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return articles.filter((paper) => {
      const matchesSearch = paper.title.toLowerCase().includes(q) ||
        paper.authors.some((a) => a.toLowerCase().includes(q));
      const matchesCategory = selectedCategory === "All" || paper.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [articles, searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Research Library</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Explore our collection of eye health research, studies, and publications from Rwanda and the region.
            </p>
          </div>
        </section>

        {/* Search and Filter */}
        <section className="py-8 border-b">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search by title or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Papers List */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="mb-6 flex justify-between items-center">
              <p className="text-muted-foreground">
                {loading ? "Loading..." : `${filteredArticles.length} publications found`}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No publications found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredArticles.map((paper) => (
                  <div key={paper._id} className="card-elevated p-6 hover:shadow-lg transition-shadow">
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="flex-1">
                        <div className="flex items-start gap-4 mb-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold mb-1 hover:text-primary cursor-pointer">{paper.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {paper.authors.join(", ")}
                            </p>
                          </div>
                        </div>

                        <p className="text-muted-foreground mb-4 line-clamp-2">{paper.abstract}</p>

                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full">{paper.category}</span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {paper.year}
                          </span>
                          <span className="text-muted-foreground">{paper.journal}</span>
                          <span className="text-muted-foreground">{paper.citations} citations</span>
                        </div>
                      </div>

                      <div className="flex lg:flex-col gap-2 shrink-0">
                        {paper.download_url && (
                          <Button size="sm" className="flex-1 lg:flex-none" asChild>
                            <a href={paper.download_url} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </a>
                          </Button>
                        )}
                        {paper.external_url && (
                          <Button size="sm" variant="outline" className="flex-1 lg:flex-none" asChild>
                            <a href={paper.external_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Online
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Submit Research CTA */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Contribute to Our Research</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              Are you conducting eye health research in Rwanda or the region? Submit your work to be featured in our library.
            </p>
            <Button size="lg">
              Submit Your Research
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
