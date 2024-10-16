import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/navbar";
import HowToUse from "@/components/HowToUse";
import Footer from "@/components/Footer";
import { RxDoubleArrowUp, RxDoubleArrowDown } from "react-icons/rx";
import "../css/app.css";
import "../app/globals.css";

export default function ConvertPage() {
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const contentRef = useRef(null);
  const containerRefs = useRef([]);

  containerRefs.current = [];

  const addToRefs = (el) => {
    if (el && !containerRefs.current.includes(el)) {
      containerRefs.current.push(el);
    }
  };

  // const scrollToContainer = (index) => {
  //   if (containerRefs.current[index]) {
  //     const { top } = containerRefs.current[index].getBoundingClientRect();
  //     window.scrollTo({
  //       top: window.scrollY + top,
  //       behavior: "smooth",
  //     });
  //   }
  // };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.2 }
    );

    containerRefs.current.forEach((container) => {
      if (container) observer.observe(container);
    });

    return () => {
      containerRefs.current.forEach((container) => {
        if (container) observer.unobserve(container);
      });
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > lastScrollY && showNavbar) {
        setShowNavbar(false);
      } else if (window.scrollY < lastScrollY && !showNavbar) {
        setShowNavbar(true);
      }
      setLastScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY, showNavbar]);

  return (
    <>
      <div className={`head ${showNavbar ? "show" : "hide"}`}>
        {/* */}
        <Navbar />
      </div>

      <div style={{ height: "500px" }}></div>
      <div ref={addToRefs} className="fade-in-section">
        <Footer />
      </div>
    </>
  );
}
