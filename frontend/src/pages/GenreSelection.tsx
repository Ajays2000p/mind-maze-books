import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { userApi } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AVAILABLE_GENRES = [
  "Fiction",
  "Mystery",
  "Romance",
  "Fantasy",
  "Horror",
  "Biography",
  "History",
  "Psychology",
  "Adventure",
  "Drama"
];

export default function GenreSelection() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Track array of selected genres preserving selection order
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genre)) {
        return prev.filter((g) => g !== genre);
      } else {
        return [...prev, genre];
      }
    });
  };

  const handleContinue = async () => {
    if (selectedGenres.length < 3) {
      toast({
        title: "Selection required",
        description: "Please select at least 3 genres.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Send selected genres to backend (backend takes ONLY the first 3 selected)
      const { data } = await userApi.updateFavoriteGenres(selectedGenres);

      // Update stored user details
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        parsed.favoriteGenres = data.favoriteGenres;
        localStorage.setItem("user", JSON.stringify(parsed));
      }

      toast({
        title: "Genres Saved!",
        description: "Generating your personalized recommendations...",
      });

      window.dispatchEvent(new CustomEvent("recommendationsUpdated"));

      // Redirect to Home to view recommendations
      navigate("/");
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to save genre preferences";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isRequirementMet = selectedGenres.length >= 3;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl shadow-2xl border-0">
        <CardHeader className="text-center space-y-3 pt-8 pb-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles className="w-6 h-6" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Select Your Favorite Genres
          </CardTitle>
          <CardDescription className="text-base max-w-md mx-auto">
            Choose at least 3 genres so we can tailor your initial recommendations.
          </CardDescription>

          {/* Counter Badge */}
          <div className="pt-2">
            <span
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                isRequirementMet
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
              }`}
            >
              Selected: {selectedGenres.length} / 3
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-6 pb-8">
          {/* Warning Message if fewer than 3 selected */}
          {!isRequirementMet && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-sm font-medium animate-pulse">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Please select at least 3 genres.</span>
            </div>
          )}

          {/* 10 Genre Grid Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {AVAILABLE_GENRES.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              const selectionIndex = selectedGenres.indexOf(genre);

              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`relative p-4 rounded-xl text-center font-medium text-sm transition-all duration-200 flex flex-col items-center justify-center gap-2 select-none ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-lg scale-105 ring-2 ring-primary/50"
                      : "bg-card hover:bg-accent border border-border text-foreground hover:scale-102"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary-foreground/20 text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                  <span>{genre}</span>
                  {isSelected && (
                    <span className="text-[11px] opacity-80 font-mono">
                      #{selectionIndex + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Helper Note for Selection Order */}
          {selectedGenres.length > 3 && (
            <p className="text-xs text-center text-muted-foreground italic">
              * Note: Recommendations will be generated using your first 3 selections (
              {selectedGenres.slice(0, 3).join(", ")}).
            </p>
          )}

          {/* Action Button */}
          <div className="pt-4">
            <Button
              onClick={handleContinue}
              disabled={!isRequirementMet || submitting}
              className="w-full py-6 text-base font-semibold shadow-lg transition-all duration-300 disabled:opacity-50"
            >
              {submitting ? "Generating Recommendations..." : "Get Recommendations →"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
