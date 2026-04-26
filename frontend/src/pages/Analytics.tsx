import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import { 
  BarChart3, 
  PieChart as PieIcon, 
  BookOpen, 
  Loader2, 
  TrendingUp, 
  Search, 
  History,
  Lightbulb
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { userApi } from "@/services/api";

const CHART_COLORS = [
  "hsl(190,60%,42%)",
  "hsl(220,55%,55%)",
  "hsl(160,50%,45%)",
  "hsl(35,70%,55%)",
  "hsl(340,55%,55%)",
];

export default function Analytics() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const { data } = await userApi.getProfile();
        setProfile(data);
      } catch (error) {
        console.error("Failed to fetch analytics", error);
        toast({ title: "Failed to load analytics", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background w-full">
        <Navbar />
        <div className="w-full px-6 lg:px-10 py-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background w-full">
        <Navbar />
        <div className="w-full px-6 lg:px-10 py-20 text-center">
          <p className="text-base text-muted-foreground">Please sign in to view your analytics.</p>
          <Button className="mt-4" size="sm" asChild><Link to="/login">Sign In</Link></Button>
        </div>
      </div>
    );
  }

  const { ratings, analytics } = profile;

  return (
    <div className="min-h-screen bg-background w-full">
      <Navbar />
      <main className="w-full min-h-screen flex flex-col px-6 lg:px-10 py-10 gap-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <BookOpen size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Books Rated</p>
                <p className="text-2xl font-bold">{ratings.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                <PieIcon size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Top Genre</p>
                <p className="text-xl font-bold truncate max-w-[150px]">{analytics.genrePreference[0]?.name || "N/A"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="border shadow-sm bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PieIcon size={16} /> Genre Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ratings.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie 
                      data={analytics.genrePreference} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="55%" 
                      outerRadius={100} 
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {analytics.genrePreference.map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground italic text-sm">
                  Rate books to see your genre breakdown
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 size={16} /> Rating Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ratings.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.ratingDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                    <XAxis dataKey="stars" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(190,60%,42%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground italic text-sm">
                  Rate books to see your rating distribution
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Insight Card */}
        <Card className="border bg-primary/5">
          <CardContent className="p-6 flex items-start gap-4">
            <Lightbulb size={24} className="text-primary mt-1 shrink-0" />
            <div>
              <p className="text-base font-semibold text-foreground">Personalized Insight</p>
              <p className="text-sm text-foreground/80 mt-1.5 leading-relaxed">
                {ratings.length > 0 ? (
                  <>Based on your history, you lean heavily towards <span className="text-primary font-bold">{analytics.genrePreference[0]?.name}</span>. You tend to rate books <span className="text-primary font-bold">higher</span> than average.</>
                ) : (
                  <>Rate more books to unlock personalized reading insights and ML-powered charting.</>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* My Ratings List */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30 py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <History size={16} /> My Ratings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ratings.length > 0 ? (
              <div className="divide-y">
                {ratings.map(({ id, book, rating, createdAt }: any) => (
                  <div key={id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 hover:bg-muted/50 transition-colors">
                    <img src={book.coverUrl} alt={book.title} className="w-16 h-20 object-cover rounded-md shadow-sm" />
                    <div className="flex-1 space-y-1">
                      <Link to={`/book/${book.id}`} className="text-base font-semibold text-foreground hover:text-primary transition-colors">{book.title}</Link>
                      <p className="text-sm text-muted-foreground">by {book.author}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 w-full sm:w-auto">
                      <StarRating rating={rating} size={16} />
                      <p className="text-xs text-muted-foreground mt-1">Rated on {createdAt}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Search size={40} className="text-muted-foreground opacity-20" />
                <p className="text-sm text-muted-foreground font-medium">You haven't rated any books yet.</p>
                <Button size="sm" variant="outline" asChild><Link to="/browse">Browse Books</Link></Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
