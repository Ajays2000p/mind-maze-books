import { useState, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { StarRating } from "@/components/StarRating";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { BookCard } from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { bookApi, ratingApi, mlApi } from "@/services/api";
import { BookMetadata } from "@/components/BookMetadata";

export default function BookDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isNewArrivalFromState = location.state?.isNewArrival;
  const [book, setBook] = useState<any>(null);
  const [similarBooks, setSimilarBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [userRating, setUserRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [coverSource, setCoverSource] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasError, setHasError] = useState(false);



  useEffect(() => {
    const fetchBookAndRating = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const bookRes = await bookApi.getById(id);
        const mappedBook = {
          ...bookRes.data,
          id: bookRes.data?._id,
          genre: bookRes.data?.genres || [],
          coverUrl: bookRes.data?.thumbnailUrl || "/placeholder.svg",
          averageRating: bookRes.data?.rating || 0,
          ratingCount: bookRes.data?.ratingCount || 0
        };

        setBook(mappedBook);
        setCoverSource(mappedBook.coverUrl);

        // Fetch user's rating (only if authenticated)
        if (localStorage.getItem('token')) {
          try {
            const ratingRes = await ratingApi.getUserRating(id);
            if (ratingRes.data && ratingRes.data.value > 0) {
              setUserRating(ratingRes.data.value);
              setSubmitted(true);
            }
          } catch (e) {
            console.error("Failed to fetch user rating", e);
          }
        }

        // Fetch similar books from ML engine (independent failure)
        try {
          const similarRes = await mlApi.getSimilar(id);
          setSimilarBooks(similarRes.data.map((b: any) => ({
            ...b,
            id: b._id,
            genre: b.genres,
            coverUrl: b.thumbnailUrl,
            averageRating: b.rating,
            matchScore: Math.floor(70 + Math.random() * 25)
          })));
        } catch (e) {
          console.error("Failed to fetch similar books", e);
          setSimilarBooks([]);
        }
      } catch (error) {
        toast({ title: "Failed to load book details", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchBookAndRating();
  }, [id]);

  const submitRating = async () => {
    if (userRating === 0) { toast({ title: "Select a rating first", variant: "destructive" }); return; }
    try {
      await ratingApi.submit(id!, userRating);
      setSubmitted(true);
      toast({ title: `Rated ${userRating} stars!` });
    } catch (error) {
      toast({ title: "Failed to submit rating", variant: "destructive" });
    }
  };

  const handleImageError = async () => {
    if (hasError || isGenerating) return; // Prevent infinite loops
    setHasError(true);
    setIsGenerating(true);
    try {
      const response = await bookApi.generateCover(book.id);
      if (response.data && response.data.thumbnailUrl) {
        setCoverSource(response.data.thumbnailUrl);
        setHasError(false);
      }
    } catch (e) {
      console.error("Failed to generate cover fallback for", book.id);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading || !book) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <p className="text-muted-foreground animate-pulse text-sm">Loading book details...</p>
        </div>
      </div>
    );
  }

  const isNewArrival =
    (book?.popularityScore || 0) >= 200 &&
    (book?.popularityScore || 0) <= 300 &&
    (book?.ratingCount || 0) >= 30 &&
    (book?.ratingCount || 0) <= 50;

  return (
    <div className="min-h-screen bg-background w-full">
      <Navbar />
      <main className="w-full min-h-screen flex flex-col px-6 lg:px-10 py-8">
        <button 
          onClick={() => {
            if (window.history.state && window.history.state.idx > 0) {
              navigate(-1);
            } else {
              navigate("/browse");
            }
          }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 bg-transparent border-0 p-0 cursor-pointer w-fit"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Two-column layout */}
        <div className="grid md:grid-cols-[280px_1fr] gap-8">
          {/* Left: Cover */}
          <div className="space-y-4">
            <div className="w-full max-w-[280px] rounded-lg shadow-sm overflow-hidden aspect-[3/4] bg-muted relative">
              {isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground animate-pulse p-4 text-center">
                  <Loader2 className="w-8 h-8 mb-3 animate-spin text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-widest">Generating Cover</span>
                </div>
              ) : (
                <img 
                  src={coverSource} 
                  alt={book.title} 
                  onError={handleImageError}
                  className="w-full h-full object-cover" 
                />
              )}
            </div>
          </div>

          {/* Right: Details */}
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{book?.title || "Untitled"}</h1>
              <p className="text-base text-muted-foreground mt-1">by {book?.author || "Unknown"}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {book?.genre?.map?.((g: string) => (
                  <span key={g} className="inline-block text-xs px-2.5 py-1 rounded-full bg-accent text-accent-foreground">{g}</span>
                ))}
              </div>
            </div>

            <BookMetadata
              views={book?.popularityScore || 0}
              ratingCount={book?.ratingCount || 0}
              averageRating={book?.averageRating}
              isNewArrival={isNewArrivalFromState || book?.publishedDate?.includes('2024') || book?.publishedDate?.includes('2025')}
              bookId={book?._id}
            />

            <p className="text-sm text-foreground/80 leading-relaxed">{book.description}</p>

            <div className="flex gap-6 text-sm text-muted-foreground">
              <span>{book.pages || 300} pages</span>
              <span>Published {book.publishedDate || '2020'}</span>
            </div>

            {/* Rating Widget */}
            <Card className="border">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm text-foreground">Rate this book</h3>
                {!localStorage.getItem('token') ? (
                  <Link to="/login" className="text-sm text-primary hover:underline block mt-1">
                    Sign in to submit a rating
                  </Link>
                ) : (submitted && !isNewArrival) ? (
                  <p className="text-sm text-primary font-medium">Thank you for rating this book!</p>
                ) : (
                  <div className="flex items-center gap-3">
                    <StarRating rating={userRating} size={24} interactive onRate={setUserRating} />
                    <Button size="sm" className="h-8 text-sm" onClick={submitRating} disabled={userRating === 0}>
                      Submit Rating
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>



          </div>
        </div>

        {/* Similar Books */}
        {similarBooks.length > 0 && (
          <section className="mt-12 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">You May Also Like</h2>
            <p className="text-sm text-muted-foreground">Based on content similarity to {book.title}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 w-full">
              {similarBooks.map((b) => (
                <BookCard key={b.id} book={b} showMatch />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
