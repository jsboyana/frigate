import { UserAuthForm } from "@/components/auth/AuthForm";
// import Logo from "@/components/Logo";
import { ThemeProvider } from "@/context/theme-provider";
import { getCookie } from "@/utils/cookieUtil";
import { useEffect } from "react";

const LoginPage = () => {
  const isAuthenticated = () => getCookie("auth") !== null;

  useEffect(() => {
    if (isAuthenticated()) {
      window.location.href = "/";
    }
  });

  return (
    <ThemeProvider defaultTheme="system" storageKey="frigate-ui-theme">
      <div className="flex size-full min-h-screen items-center justify-center overflow-hidden bg-[url('/images/Background-1.jpg')] bg-cover bg-no-repeat">
        <div className="p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col items-center space-y-2">
              <img src={"/images/KL-logo.svg"} />
            </div>
            <UserAuthForm />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default LoginPage;
