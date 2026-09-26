import { useEffect, useRef, useState } from "react";

/** Fires once when the element first scrolls into view. */
export function useInViewOnce<TElement extends Element>(rootMargin = "-10% 0px") {
  const ref = useRef<TElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}
