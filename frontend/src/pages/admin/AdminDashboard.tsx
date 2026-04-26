import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, BookOpen, Star, TrendingUp, Plus, Trash2, Edit, Ban, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StarRating } from "@/components/StarRating";
import { adminApi, bookApi } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

const COLORS = ["hsl(190,60%,42%)", "hsl(220,55%,55%)", "hsl(160,50%,45%)", "hsl(35,70%,55%)", "hsl(340,55%,55%)", "hsl(270,50%,55%)"];

export default function AdminDashboard() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBook, setNewBook] = useState({
    title: "",
    author: "",
    genres: "",
    description: "",
    thumbnailUrl: ""
  });

  const loadData = async () => {
    try {
      const [statsRes, usersRes, booksRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
        bookApi.getAll({ limit: 50 })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setBooks(booksRes.data.books);
    } catch (err) {
      toast({ title: "Failed to load admin data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authUser?.isAdmin) return;
    loadData();
  }, [authUser]);

  useEffect(() => {
    if (!authUser?.isAdmin) return;
    
    const handleSearch = async () => {
      if (!searchQuery.trim()) {
        const booksRes = await bookApi.getAll({ limit: 50 });
        setBooks(booksRes.data.books);
        return;
      }

      setIsSearching(true);
      try {
        const { data } = await bookApi.search(searchQuery);
        setBooks(data);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(handleSearch, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, authUser]);

  const genreCompositionData = useMemo(() => {
    if (!books || books.length === 0) return [];
    
    let singleCount = 0;
    let multiCount = 0;

    books.forEach(book => {
      // Handle MongoDB 'genres' (array) or legacy 'genre'
      const g = book.genres || book.genre;
      if (Array.isArray(g)) {
        if (g.length > 1) {
          multiCount++;
        } else {
          singleCount++;
        }
      } else {
        singleCount++;
      }
    });

    return [
      { name: "Single Genre", count: singleCount, color: "hsl(190,60%,42%)" },
      { name: "Multi Genre", count: multiCount, color: "hsl(35,70%,55%)" }
    ];
  }, [books]);

  if (!authUser?.isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20 text-center">
          <p className="text-muted-foreground italic">Restricted Access: Admins Only</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8" /></div>;

  const handleDeleteBook = async (id: string) => {
    try {
      await bookApi.delete(id);
      setBooks(books.filter(b => b._id !== id));
      toast({ title: "Book deleted" });
    } catch (err) {
      toast({ title: "Failed to delete book", variant: "destructive" });
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title || !newBook.author) {
      toast({ title: "Title and Author are required", variant: "destructive" });
      return;
    }

    try {
      const genresArray = newBook.genres.split(',').map(g => g.trim()).filter(g => g !== '');
      const { data } = await bookApi.create({
        ...newBook,
        genres: genresArray
      });
      
      // Update local state: add to the beginning of the list
      setBooks([data, ...books]);
      setIsAddDialogOpen(false);
      
      // Reset form
      setNewBook({
        title: "",
        author: "",
        genres: "",
        description: "",
        thumbnailUrl: ""
      });
      
      toast({ title: "Book added successfully!" });
    } catch (err) {
      console.error("Add book error:", err);
      toast({ title: "Failed to add book", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background w-full">
      <Navbar />
      <main className="w-full min-h-screen flex flex-col px-6 lg:px-10 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: stats?.totalUsers || 0, icon: Users },
            { label: "Total Books", value: stats?.totalBooks || 0, icon: BookOpen },
            { label: "Total Ratings", value: stats?.totalRatings || 0, icon: Star },
            { label: "Avg Popularity", value: "High", icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent">
                  <Icon size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="books" className="space-y-4">
          <TabsList>
            <TabsTrigger value="books">Books</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="books">
            <Card className="border">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Manage Books</CardTitle>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus size={16} /> Add Book
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add New Book</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddBook} className="space-y-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input 
                          id="title" 
                          value={newBook.title} 
                          onChange={(e) => setNewBook({...newBook, title: e.target.value})} 
                          placeholder="Enter book title" 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="author">Author *</Label>
                        <Input 
                          id="author" 
                          value={newBook.author} 
                          onChange={(e) => setNewBook({...newBook, author: e.target.value})} 
                          placeholder="Enter author name" 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="genres">Genres (comma-separated)</Label>
                        <Input 
                          id="genres" 
                          value={newBook.genres} 
                          onChange={(e) => setNewBook({...newBook, genres: e.target.value})} 
                          placeholder="e.g. Fantasy, Adventure, Magic" 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
                        <Input 
                          id="thumbnailUrl" 
                          value={newBook.thumbnailUrl} 
                          onChange={(e) => setNewBook({...newBook, thumbnailUrl: e.target.value})} 
                          placeholder="https://example.com/image.jpg" 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea 
                          id="description" 
                          value={newBook.description} 
                          onChange={(e) => setNewBook({...newBook, description: e.target.value})} 
                          placeholder="Enter book description..." 
                          className="min-h-[100px]"
                        />
                      </div>
                      <DialogFooter className="pt-4">
                        <Button type="submit" className="w-full">Save Book</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="Search by full book title or author..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md"
                  />
                  {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>

                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Title</TableHead><TableHead>Author</TableHead><TableHead>Rating</TableHead><TableHead>Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {books.length > 0 ? (
                      books.map((b) => (
                        <TableRow key={b._id}>
                          <TableCell className="text-sm font-medium">{b.title}</TableCell>
                          <TableCell className="text-sm">{b.author}</TableCell>
                          <TableCell className="text-sm">{b.rating}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => handleDeleteBook(b._id)}>
                              <Trash2 size={13} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                          {isSearching ? "Searching..." : "No books found"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead className="whitespace-nowrap">Number of Books Rated</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-sm font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell className="text-sm">{u.ratings}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 gap-6">
              <Card className="border w-full">
                <CardHeader><CardTitle className="text-base text-center">Single vs Multi Genre Distribution</CardTitle></CardHeader>
                <CardContent className="p-6">
                  {genreCompositionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={500}>
                      <PieChart>
                        <Pie 
                          data={genreCompositionData} 
                          dataKey="count" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={180} 
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {genreCompositionData.map((entry: any, i: number) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-[500px] text-muted-foreground">No data available</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
