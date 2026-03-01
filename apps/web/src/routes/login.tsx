import { GoogleLogin } from "@react-oauth/google";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useGoogleLogin } from "../api/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const LoginPage = () => {
  const navigate = useNavigate();
  const googleLogin = useGoogleLogin();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">AdvancedVocab</h1>
          <p className="mt-2 text-gray-500 text-sm">
            Master vocabulary from advanced to proficiency level
          </p>
        </div>

        <div className="w-full border-t border-gray-100" />

        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-gray-600 text-sm">Sign in to continue</p>
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              if (credentialResponse.credential) {
                googleLogin.mutate(credentialResponse.credential, {
                  onSuccess: () => {
                    navigate({ to: "/dashboard" });
                  },
                });
              }
            }}
            onError={() => {
              console.error("Google login failed");
            }}
            useOneTap
          />
          {googleLogin.isError && (
            <p className="text-red-500 text-sm text-center">
              Sign-in failed. Please try again.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
