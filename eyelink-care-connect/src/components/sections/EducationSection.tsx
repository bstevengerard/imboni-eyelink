import {
  BookOpen,
  AlertTriangle,
  Eye,
  Baby,
  Droplet,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import educationImage from '@/assets/61514.jpg';

export default function EducationSection() {
  const topics = [
    {
      icon: Eye,
      title: 'Refractive Errors',
      description: 'Learn about common vision problems like myopia, hyperopia, and astigmatism.',
      color: 'primary',
    },
    {
      icon: Droplet,
      title: 'Glaucoma',
      description: 'Understanding the silent thief of sight and early detection methods.',
      color: 'accent',
    },
    {
      icon: AlertTriangle,
      title: 'Diabetic Eye Disease',
      description: 'How diabetes affects your eyes and preventive care measures.',
      color: 'warning',
    },
    {
      icon: Baby,
      title: 'Childhood Eye Health',
      description: 'Important eye care milestones and screening for children.',
      color: 'secondary',
    },
  ];

  const myths = [
    {
      myth: 'Reading in dim light damages your eyes',
      fact: 'Reading in dim light may cause eye strain, but it doesn\'t permanently damage your eyes',
    },
    {
      myth: 'Carrots are the only food that improves vision',
      fact: 'While carrots are good for eye health, many other foods like leafy greens and fish also support vision',
    },
    {
      myth: 'Screens cause permanent eye damage',
      fact: 'Screens can cause eye strain, but following the 20-20-20 rule helps prevent long-term damage',
    },
  ];

  return (
    <section className="py-24 section-gradient overflow-hidden" id="education">
      <div className="container mx-auto px-4">
        {/* Featured Image & Header */}
        <div className="relative h-64 md:h-96 rounded-3xl overflow-hidden mb-12">
          <img 
            src={educationImage} 
            alt="Eye health education" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <span className="inline-block px-4 py-2 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 text-primary text-sm font-medium mb-4">
              Eye Health Education
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Learn About Eye Health
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Discover essential information about maintaining healthy vision and preventing eye diseases.
            </p>
          </div>
        </div>

        {/* Topics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {topics.map((topic) => (
            <Link 
              key={topic.title}
              to={`/education#${topic.title.toLowerCase().replace(' ', '-')}`}
              className="card-service group"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                topic.color === 'primary' ? 'bg-primary/10 text-primary' :
                topic.color === 'accent' ? 'bg-accent/10 text-accent' :
                topic.color === 'warning' ? 'bg-warning/10 text-warning' :
                'bg-secondary/10 text-secondary'
              }`}>
                <topic.icon className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                {topic.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{topic.description}</p>
              <span className="inline-flex items-center text-sm text-primary font-medium gap-2 group-hover:gap-3 transition-all">
                Learn More <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>

        {/* Myth Busters */}
        <div className="bg-card rounded-3xl p-8 md:p-12 shadow-lg">
          <div className="flex items-center gap-3 mb-8">
            <BookOpen className="h-8 w-8 text-primary" />
            <h3 className="text-2xl font-bold text-foreground">Eye Health Myths Busted</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {myths.map((item, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-1">
                    <span className="text-destructive text-sm font-bold">✗</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground line-through decoration-destructive/50">
                      {item.myth}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center shrink-0 mt-1">
                    <span className="text-success text-sm font-bold">✓</span>
                  </div>
                  <p className="text-muted-foreground">{item.fact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
