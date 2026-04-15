import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/AuthContext";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isLoading) {
      navigate({ to: auth.isAuthenticated ? "/dashboard" : "/login" });
    }
  }, [auth.isLoading, auth.isAuthenticated, navigate]);

  return null;
}
