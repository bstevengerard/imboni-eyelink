import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

type Testimonial = {
  _id?: string;
  id?: string;
  name: string;
  role?: string;
  location?: string;
  rating?: number;
  content: string;
  image_url?: string | null;
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api.get<Testimonial[]>('/api/testimonials')
      .then((res) => {
        if (cancelled) return;
        if (res.success && Array.isArray(res.data)) {
          setTestimonials(res.data);
          setCurrentIndex(0);
        }
      })
      .catch(() => {
        if (!cancelled) setTestimonials([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const currentTestimonial = testimonials[currentIndex];

  const nextTestimonial = () => {
    if (testimonials.length === 0) return;
    setImageLoaded(false);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    if (testimonials.length === 0) return;
    setImageLoaded(false);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <section className="py-24 bg-muted/50 overflow-hidden" id="testimonials">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4">
            Success Stories
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What Our Testimonials Say about us!
          </h2>
          <p className="text-lg text-muted-foreground">
            Real stories from the people transformed through our eye care services.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative bg-card rounded-3xl p-8 md:p-12 shadow-xl min-h-[360px]">
            <div className="absolute -top-6 left-8 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Quote className="h-6 w-6 text-primary-foreground" />
            </div>

            {loading ? (
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-full" />
                <div className="flex-1 space-y-4 w-full">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-5 w-48" />
                </div>
              </div>
            ) : testimonials.length === 0 ? (
              <div className="text-center py-12">
                <Quote className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No success stories yet</h3>
                <p className="text-muted-foreground">
                  Success stories will appear here once they're available.
                </p>
              </div>
            ) : currentTestimonial && (
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="shrink-0 relative">
                  {!imageLoaded && !currentTestimonial.image_url && (
                    <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-full" />
                  )}
                  {currentTestimonial.image_url ? (
                    <>
                      {!imageLoaded && (
                        <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-full" />
                      )}
                      <img
                        src={currentTestimonial.image_url}
                        alt={currentTestimonial.name}
                        className={`w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-primary/20 transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        onLoad={handleImageLoad}
                        style={{ display: imageLoaded ? 'block' : 'none' }}
                      />
                    </>
                  ) : (
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-primary/20 bg-primary/10 text-primary flex items-center justify-center text-xl md:text-2xl font-semibold">
                      {getInitials(currentTestimonial.name)}
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center md:text-left">
                  <div className="flex gap-1 justify-center md:justify-start mb-4">
                    {Array.from({ length: Math.min(5, Math.max(0, Math.round(currentTestimonial.rating ?? 0))) }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-secondary fill-secondary" />
                    ))}
                  </div>

                  <blockquote className="text-lg md:text-xl text-foreground mb-6 leading-relaxed">
                    "{currentTestimonial.content}"
                  </blockquote>

                  <div>
                    <div className="font-semibold text-foreground">
                      {currentTestimonial.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {currentTestimonial.role || 'Patient'} • {currentTestimonial.location || 'Location not provided'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {testimonials.length > 0 && (
              <div className="flex justify-center gap-4 mt-8">
                <button
                  onClick={prevTestimonial}
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setImageLoaded(false);
                        setCurrentIndex(i);
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === currentIndex ? 'w-8 bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={nextTestimonial}
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
