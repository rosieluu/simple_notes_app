import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";

function Hero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const navigate = useNavigate();
  const titles = useMemo(
    () => ["amazing", "new", "wonderful", "beautiful", "smart"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  const isAuthenticated = loggedInUser !== null && loggedInUser !== undefined;

  return (
    <div className="w-full bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="flex gap-8 py-20 lg:py-32 items-center justify-center flex-col">
          <div>
            <Button className="gap-2 bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200">
              {isAuthenticated ? "Welcome to your studio!" : "Discover our portfolio"}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Button>
          </div>
          <div className="flex gap-6 flex-col">
            <h1 className="text-4xl md:text-6xl lg:text-7xl max-w-4xl tracking-tight text-center font-bold">
              <span className="text-gray-900">This is something</span>
              <br />
              <span className="relative flex w-full justify-center overflow-hidden text-center py-2">
                <span 
                  className="font-bold text-primary transition-all duration-500 ease-in-out"
                  style={{
                    transform: `translateY(${titleNumber * 100}%)`,
                    opacity: 1
                  }}
                >
                  {titles[titleNumber]}
                </span>
              </span>
            </h1>

            <p className="text-lg md:text-xl leading-relaxed tracking-normal text-gray-600 max-w-2xl text-center">
              {isAuthenticated 
                ? "Welcome to your real estate project manager. Organize your ideas and create stunning visuals to enhance your properties."
                : "Instantly transform your photos into real estate visuals that sell"
              }
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            {isAuthenticated ? (
              // Boutons pour utilisateurs connectés
              <>
                <Button 
                  className="gap-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-6 py-3"
                  onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
                >
                  View my projects
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </Button>
                <Button className="gap-2 bg-primary text-white hover:bg-primary-hover px-6 py-3">
                  Generate photo
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </Button>
              </>
            ) : (
              // Boutons pour utilisateurs non connectés
              <>
                <Button 
                  className="gap-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-6 py-3"
                  onClick={() => navigate('/signin')}
                >
                  View gallery
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </Button>
                <Button 
                  className="gap-2 bg-primary text-white hover:bg-primary-hover px-6 py-3"
                  onClick={() => navigate('/signin')}
                >
                  Get started free
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero };
