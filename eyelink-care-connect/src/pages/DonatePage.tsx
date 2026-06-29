import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DialogDescription } from "@/components/ui/dialog";
import { Copy, Check, Phone, Image as ImageIcon, Loader2, Heart, Shield, Gift, TrendingUp } from "lucide-react";
import heroBg from "@/assets/61514.jpg";
import logo from "@/assets/logo.png";

const MTN_ICON = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQOr-NGcJiPmYjlwv1dlAcDe-AfNyqNVCGoAxRtwmeJfA&s=10";
const AIRTEL_ICON = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSMPr__glo4KWnkvfgvdsJj9iKC_KqfalH7J0hzs02t9w&s=10";

type DonationSettings = {
  mtn_number: string;
  airtel_number: string;
  headline?: string;
  description?: string;
};

type ProviderKey = "mtn" | "airtel";

type DonationPost = {
  _id: string;
  title?: string;
  content?: string;
  image_urls?: string[];
  is_published?: boolean;
  order?: number;
};

export default function DonatePage() {
  const [settings, setSettings] = useState<DonationSettings | null>(null);
  const [posts, setPosts] = useState<DonationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<ProviderKey>("mtn");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [settingsRes, postsRes] = await Promise.all([
          api.get<DonationSettings>("/api/donations/settings"),
          api.get<{ success: boolean; data: DonationPost[] }>("/api/donations/posts"),
        ]);
        if (!mounted) return;
        setSettings(settingsRes.data || null);
        setPosts(postsRes.data?.data || []);
      } catch {
        if (!mounted) return;
        setSettings(null);
        setPosts([]);
      } finally {
        if (mounted) {
          setLoading(false);
          setPostsLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const ussdNumber =
    activeProvider === "mtn" ? settings?.mtn_number : settings?.airtel_number;

  const providerLabel = activeProvider === "mtn" ? "MTN Mobile Money" : "Airtel Money";
  const providerBg = activeProvider === "mtn" ? "bg-yellow-50 dark:bg-yellow-950/40" : "bg-red-50 dark:bg-red-950/40";
  const providerBorder = activeProvider === "mtn" ? "border-yellow-200 dark:border-yellow-800" : "border-red-200 dark:border-red-800";

  const onProviderClick = (provider: ProviderKey) => {
    setActiveProvider(provider);
    setCopied(false);
    setDialogOpen(true);
  };

  const copyUssd = async () => {
    try {
      if (!ussdNumber) return;
      await navigator.clipboard.writeText(ussdNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 relative">
      {/* Background Image with dark blur */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${heroBg})` }} />
        <div className="absolute inset-0 backdrop-blur-md bg-black/70" />
      </div>

      <div className="container relative z-10 mx-auto px-4 max-w-5xl">
        {/* Hero Section */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center justify-center mb-6 sm:mb-8">
            <img src={logo} alt="IMBONI EyeLink" className="h-16 w-auto sm:h-20 md:h-24 lg:h-28 object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
          </div>

          <div className="relative inline-block">
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-4 sm:mb-6 tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
              {settings?.headline || "Give the Gift of Sight"}
            </h1>
          </div>

          {settings?.description && (
            <p className="text-base sm:text-xl text-white/90 max-w-2xl mx-auto mb-3 sm:mb-4 leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] font-medium px-2">
              {settings.description}
            </p>
          )}
          <p className="text-sm sm:text-base text-white/80 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] font-medium px-2">
            Click a provider below to view the USSD code set by admin.
          </p>
        </div>

        {/* Payment Providers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-3xl mx-auto mb-12 sm:mb-16">
          {/* MTN Card */}
          <Card
            onClick={() => onProviderClick("mtn")}
            className="relative overflow-hidden border-2 border-yellow-200 dark:border-yellow-800 hover:shadow-2xl hover:shadow-yellow-500/10 hover:-translate-y-1 cursor-pointer transition-all duration-300 group bg-white dark:bg-card"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/10 opacity-60 group-hover:opacity-80 transition-opacity" />
            <div className="relative p-6 sm:p-8 flex flex-col items-center gap-4 sm:gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white dark:bg-white shadow-lg flex items-center justify-center p-2 border border-yellow-100 dark:border-yellow-900 group-hover:scale-105 transition-transform">
                <img
                  src={MTN_ICON}
                  alt="MTN Mobile Money"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
                <Phone className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600 hidden" />
              </div>
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">MTN Mobile Money</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Click to view USSD code</p>
              </div>
              <Button className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:shadow-lg text-white font-semibold h-10 sm:h-12 text-sm sm:text-base" disabled={loading}>
                View MTN USSD Code
              </Button>
            </div>
          </Card>

          {/* Airtel Card */}
          <Card
            onClick={() => onProviderClick("airtel")}
            className="relative overflow-hidden border-2 border-red-200 dark:border-red-800 hover:shadow-2xl hover:shadow-red-500/10 hover:-translate-y-1 cursor-pointer transition-all duration-300 group bg-white dark:bg-card"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/10 opacity-60 group-hover:opacity-80 transition-opacity" />
            <div className="relative p-6 sm:p-8 flex flex-col items-center gap-4 sm:gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white dark:bg-white shadow-lg flex items-center justify-center p-2 border border-red-100 dark:border-red-900 group-hover:scale-105 transition-transform">
                <img
                  src={AIRTEL_ICON}
                  alt="Airtel Money"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
                <Phone className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 hidden" />
              </div>
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Airtel Money</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Click to view USSD code</p>
              </div>
              <Button className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:shadow-lg text-white font-semibold h-10 sm:h-12 text-sm sm:text-base" disabled={loading}>
                View Airtel USSD Code
              </Button>
            </div>
          </Card>
        </div>

        {/* Admin Posts Section */}
        {!postsLoading && posts.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 sm:mb-3">Updates & Announcements</h2>
              <p className="text-sm sm:text-base text-muted-foreground">Stay informed about our latest campaigns and impact</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {posts.map((post) => (
                <Card key={post._id} className="overflow-hidden border-2 hover:shadow-xl transition-all h-full flex flex-col">
                  {post.image_urls && post.image_urls.length > 0 ? (
                    <div className="relative h-40 sm:h-48 md:h-52 w-full bg-muted">
                      <img
                        src={post.image_urls[0]}
                        alt={post.title || "Donation post"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                      <div className="hidden absolute inset-0 flex items-center justify-center bg-muted/80">
                        <ImageIcon className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 sm:h-40 w-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <ImageIcon className="h-10 w-10 sm:h-12 sm:w-12 text-primary/40" />
                    </div>
                  )}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col">
                    {post.title && (
                      <h3 className="text-base sm:text-lg font-bold text-foreground mb-1 sm:mb-2">{post.title}</h3>
                    )}
                    {post.content && (
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 flex-1">{post.content}</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-10 sm:mt-16 text-xs text-muted-foreground">
          <span className="flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
            <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" /> Secure USSD
          </span>
          <span className="flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
            <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-600" /> 100% to Eye Care
          </span>
          <span className="flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" /> Transparent
          </span>
          <span className="flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
            <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" /> Tax Deductible
          </span>
        </div>

        {/* USSD Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-xl md:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                {providerLabel}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base mt-2">
                Use the USSD code below to make your donation via {providerLabel}. Copy and paste it in the USSD menu.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
              <div>
                <div className="text-sm sm:text-base font-medium text-foreground mb-2">USSD Reference Code</div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`flex-1 rounded-xl border-2 ${providerBorder} ${providerBg} px-4 sm:px-6 py-4 sm:py-5 text-foreground font-mono text-xl sm:text-2xl md:text-3xl break-all text-center shadow-sm`}>
                    {loading ? (
                      <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto" />
                    ) : (
                      ussdNumber || "Not configured by admin"
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyUssd}
                    disabled={!ussdNumber}
                    className="shrink-0 h-14 w-14 sm:h-16 sm:w-16"
                  >
                    {copied ? <Check className="h-6 w-6 sm:h-7 sm:w-7 text-green-600" /> : <Copy className="h-6 w-6 sm:h-7 sm:w-7" />}
                  </Button>
                </div>
              </div>

              <div className={`rounded-xl border ${providerBorder} ${providerBg} p-4 sm:p-6 space-y-3 sm:space-y-4`}>
                <p className="text-base sm:text-lg font-semibold text-foreground">
                  How to donate
                </p>
                <div className="space-y-2 sm:space-y-3">
                  <p className="text-sm sm:text-base text-muted-foreground flex items-start gap-3">
                    <span className="font-bold text-primary text-base sm:text-lg">1.</span> Dial the USSD code on your phone
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground flex items-start gap-3">
                    <span className="font-bold text-primary text-base sm:text-lg">2.</span> Enter the reference code shown above
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground flex items-start gap-3">
                    <span className="font-bold text-primary text-base sm:text-lg">3.</span> Enter the donation amount
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground flex items-start gap-3">
                    <span className="font-bold text-primary text-base sm:text-lg">4.</span> Confirm and enter your PIN to complete
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
