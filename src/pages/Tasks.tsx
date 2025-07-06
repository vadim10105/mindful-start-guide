import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Tasks = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/brain-dump');
  }, [navigate]);

  return null; // Or a loading spinner if needed
};

export default Tasks;
