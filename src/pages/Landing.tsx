import { useEffect } from "react";

const Landing = () => {
  useEffect(() => {
    window.location.href = "https://bookdyn.com";
  }, []);

  return null;
};

export default Landing;
