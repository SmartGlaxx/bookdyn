import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LandingPage from "@/components/landing/LandingPage";

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCTA = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth?mode=signup");
    }
  };

  return <LandingPage onCreateBook={handleCTA} bookCount={0} />;
};

export default Landing;
