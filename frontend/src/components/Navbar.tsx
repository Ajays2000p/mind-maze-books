import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookOpen, Search, Menu, X, User, LogOut, Shield, BarChart3 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const theme = "light";
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = searchQuery.trim().replace(/\s+/g, ' ');
    if (cleanQuery) {
      navigate(`/browse?q=${encodeURIComponent(cleanQuery)}`);
      setSearchQuery("");
    }
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-50 border-b bg-card/90 backdrop-blur-sm">
      <div className="w-full flex h-14 items-center justify-between gap-4 px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/bookwise-logo.png" alt="MindMazeBooks Logo" className="h-6 w-6 object-contain" />
          <span className="text-base font-semibold text-foreground hidden sm:inline">MindMazeBooks</span>
        </Link>

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search books or authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-muted/50 border-0 text-sm"
            />
          </div>
        </form>

        <nav className="hidden md:flex items-center gap-1">
          {!user?.isAdmin && (
            <>
              <Button variant="ghost" size="sm" className="text-sm h-8" asChild>
                <Link to="/">Dashboard</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-sm h-8" asChild>
                <Link to="/browse">Browse</Link>
              </Button>
            </>
          )}

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {!user?.isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User size={14} className="mr-2" /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/analytics")}>
                      <BarChart3 size={14} className="mr-2" /> Analytics
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => { logout(); navigate("/"); }}>
                  <LogOut size={14} className="mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" className="h-8 text-sm" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          )}
        </nav>

        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-card p-4 space-y-3">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
          </form>
          <div className="flex flex-col gap-1">
            {!user?.isAdmin && (
              <>
                <Button variant="ghost" className="justify-start h-9 text-sm" asChild onClick={() => setMobileOpen(false)}>
                  <Link to="/">Dashboard</Link>
                </Button>
                <Button variant="ghost" className="justify-start h-9 text-sm" asChild onClick={() => setMobileOpen(false)}>
                  <Link to="/browse">Browse</Link>
                </Button>
                {isAuthenticated && (
                  <>
                    <Button variant="ghost" className="justify-start h-9 text-sm" asChild onClick={() => setMobileOpen(false)}>
                      <Link to="/profile">Profile</Link>
                    </Button>
                    <Button variant="ghost" className="justify-start h-9 text-sm" asChild onClick={() => setMobileOpen(false)}>
                      <Link to="/analytics">Analytics</Link>
                    </Button>
                  </>
                )}
              </>
            )}
            
            {isAuthenticated ? (
              <Button variant="ghost" className="justify-start h-9 text-sm" onClick={() => { logout(); navigate("/"); setMobileOpen(false); }}>
                <LogOut size={14} className="mr-2" /> Logout
              </Button>
            ) : (
              <Button className="justify-start h-9 text-sm" asChild onClick={() => setMobileOpen(false)}>
                <Link to="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
