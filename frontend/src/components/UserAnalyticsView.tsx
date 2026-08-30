import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import { 
  BarChart3, 
  PieChart as PieIcon, 
  BookOpen, 
  Search, 
  History,
  Lightbulb
} from "lucide-react";
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

const CHART_COLORS = [
  "hsl(190,60%,42%)",
  "hsl(220,55%,55%)",
  "hsl(160,50%,45%)",
  "hsl(35,70%,55%)",
  "hsl(340,55%,55%)",
];

interface UserAnalyticsViewProps {
  profile: any;
  isAdminView?: boolean;
}

export function UserAnalyticsView({ profile, isAdminView = false }: UserAnalyticsViewProps) {
  if (!profile) return null;

  const user = profile?.user || {};
  const ratings = profile?.ratings || [];
  const analytics = profile?.analytics || { genrePreference: [], ratingDistribution: [] };
  const genrePreference = analytics?.genrePreference || [];
  const ratingDistribution = analytics?.ratingDistribution || [];

  return (
    <div className="space-y-8 w-full">
      {/* Stats Header */}
      <Card className="border shadow-sm w-full">
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

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border shadow-sm bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieIcon size={16} /> Genre Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ratings.length > 0 && genrePreference.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie 
                    data={genrePreference} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="55%" 
                    outerRadius={100} 
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {genrePreference.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground italic text-sm gap-2">
                <Search size={32} className="opacity-20" />
                <span>No rating history available for genre breakdown</span>
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
            {ratings.length > 0 && ratingDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ratingDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                  <XAxis dataKey="stars" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(190,60%,42%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground italic text-sm gap-2">
                <BarChart3 size={32} className="opacity-20" />
                <span>No rating distribution available</span>
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
              {ratings.length > 0 && genrePreference[0]?.name ? (
                <>Based on {isAdminView ? `${user.name || "this user"}'s` : "your"} history, {isAdminView ? "they" : "you"} lean heavily towards <span className="text-primary font-bold">{genrePreference[0].name}</span>. {isAdminView ? "They" : "You"} tend to rate books <span className="text-primary font-bold">higher</span> than average.</>
              ) : (
                <>{isAdminView ? `${user.name || "User"} has not rated enough books yet to generate personalized insights.` : "Rate more books to unlock personalized reading insights and ML-powered charting."}</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ratings History List */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/30 py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <History size={16} /> {isAdminView ? `${user.name || 'User'}'s Rating History` : "My Ratings"}
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
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Search size={40} className="text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground font-medium">
                {isAdminView ? `${user.name || "This user"} hasn't rated any books yet.` : "You haven't rated any books yet."}
              </p>
              {!isAdminView && (
                <Button size="sm" variant="outline" asChild><Link to="/browse">Browse Books</Link></Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
