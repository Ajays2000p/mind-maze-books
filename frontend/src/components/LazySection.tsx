import { useState, useEffect, useRef, ReactNode } from "react";

interface LazySectionProps {
  children: ReactNode;
  onVisible?: () => void;
  rootMargin?: string;
  minHeight?: string;
}

export function LazySection({ children, onVisible, rootMargin = "300px", minHeight = "400px" }: LazySectionProps) {
  const [hasIntersected, setHasIntersected] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasIntersected) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setHasIntersected(true);
          if (onVisible) onVisible();
          if (sectionRef.current) observer.unobserve(sectionRef.current);
        }
      },
      { rootMargin }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasIntersected, onVisible, rootMargin]);

  return (
    <div ref={sectionRef} style={{ minHeight: hasIntersected ? 'auto' : minHeight }}>
      {children}
    </div>
  );
}
