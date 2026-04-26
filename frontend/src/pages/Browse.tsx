import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { BookCard } from "@/components/BookCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { genres } from "@/lib/mock-data";
import { Search, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bookApi } from "@/services/api";
import { GenreMultiSelect } from "@/components/GenreMultiSelect";
import { useAuth } from "@/contexts/AuthContext";

const hiddenStrictGenres = ['Thriller', 'History', 'Business', 'Psychology', 'Adventure'];

export default function Browse() {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [appliedSearch, setAppliedSearch] = useState(searchParams.get("q") || "");
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    searchParams.get("genre")
      ? searchParams.get("genre")!.split(",").filter(g => genres.includes(g))
      : []
  );
  const [sort, setSort] = useState("rating");
  const [strict, setStrict] = useState(false);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedGenres.length > 0 && hiddenStrictGenres.includes(selectedGenres[0])) {
      setStrict(false);
    }
  }, [selectedGenres]);

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const { data } = await bookApi.getAll({
          search: appliedSearch,
          genre: selectedGenres.join(","),
          strict,
          page: 1,
          limit: 50
        });

        // Map MongoDB data to frontend Book interface
        const mappedBooks = data.books.map((b: any) => ({
          ...b,
          id: b._id,
          genre: b.genres,
          coverUrl: b.thumbnailUrl,
          averageRating: b.rating
        }));

        setBooks(mappedBooks);
      } catch (error) {
        console.error("Failed to fetch books", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [appliedSearch, selectedGenres, sort, strict]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(search.trim());
  };

  return (
    <div className="min-h-screen bg-background w-full">
      <Navbar />
      <main className="w-full min-h-screen flex flex-col px-6 lg:px-10 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Browse Books</h1>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by full title or author..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 w-full"
              />
              <button type="submit" className="hidden">Search</button>
            </form>
            <div className="w-full sm:w-64">
              <GenreMultiSelect
                options={genres || []}
                selected={selectedGenres}
                onChange={setSelectedGenres}
                placeholder="Filter by genres"
                singleSelect={true}
              />
            </div>
          </div>

          {selectedGenres.length > 0 && !hiddenStrictGenres.includes(selectedGenres[0]) && (
            <div className="flex items-center gap-2 px-1 mt-2">
              <input
                type="checkbox"
                id="strict-match"
                checked={strict}
                onChange={(e) => setStrict(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="strict-match" className="text-xs font-medium text-muted-foreground cursor-pointer select-none">
                Strict Match (Books with exactly this genre only)
              </label>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : books.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 w-full">
            {books.map((book: any) => (
              <BookCard 
                key={book.id} 
                book={book} 
                hideRatings={isAuthenticated} 
                hideRatingCount={isAuthenticated} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-base">No books found matching your search.</p>
          </div>
        )
        }
      </main >
    </div >
  );
}
