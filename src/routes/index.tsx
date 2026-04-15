import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    const auth = (context as any).auth;
    if (auth?.isAuthenticated) {
      throw redirect({ to: "/dashboard" });
    }
    throw redirect({ to: "/login" });
  },
  component: () => null,
});
