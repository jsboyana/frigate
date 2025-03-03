"use client";

import * as React from "react";

// import { baseUrl } from "../../api/baseUrl";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ActivityIndicator from "@/components/indicators/activity-indicator";
// import axios, { AxiosError } from "axios";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { setCookie } from "@/utils/cookieUtil";
import { users } from "@/utils/User";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const formSchema = z.object({
    user: z.string(),
    password: z.string(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      user: "",
      password: "",
    },
  });

  // const onSubmit = async (values: z.infer<typeof formSchema>) => {
  //   setIsLoading(true);
  //   try {
  //     await axios.post(
  //       "/login",
  //       {true
  //         user: values.user,
  //         password: values.password,
  //       },
  //       {
  //         headers: {
  //           "X-CSRF-TOKEN": 1,
  //         },
  //       },
  //     );
  //     window.location.href = baseUrl;
  //   } catch (error) {
  //     if (axios.isAxiosError(error)) {
  //       const err = error as AxiosError;
  //       if (err.response?.status === 429) {
  //         toast.error("Exceeded rate limit. Try again later.", {
  //           position: "top-center",
  //         });
  //       } else if (err.response?.status === 401) {
  //         toast.error("Login failed", {
  //           position: "top-center",
  //         });
  //       } else {
  //         toast.error("Unknown error. Check logs.", {
  //           position: "top-center",
  //         });
  //       }
  //     } else {
  //       toast.error("Unknown error. Check console logs.", {
  //         position: "top-center",
  //       });
  //     }

  //     setIsLoading(false);
  //   }
  // };

  function handleError() {
    toast.error(" Invalid username or password. Please try again.", {
      position: "top-center",
    });
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    const userData = {
      user: values.user.trim().toLowerCase(),
      password: values.password.trim().toLowerCase(),
    };

    // Find a matching user
    const userExists = users.find(
      (u) =>
        u.name.trim().toLowerCase() === userData.user &&
        u.password.trim().toLowerCase() === userData.password,
    );
    if (userExists) {
      setCookie("auth", "True", 4);
      window.location.href = "/";
    } else {
      handleError();
    }
    setIsLoading(false);
  };

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            name="user"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">UserName</FormLabel>
                <FormControl>
                  <Input
                    className="text-md -foreground w-full border border-input bg-background bg-stone-50 p-2 text-black"
                    autoFocus
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black">Password</FormLabel>
                <FormControl>
                  <Input
                    className="text-md text-black-foreground w-full border border-input bg-background bg-stone-50 p-2 text-black"
                    type="password"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex flex-row gap-2 pt-5">
            <Button
              variant="select"
              disabled={isLoading}
              className="flex flex-1"
              aria-label="Login"
            >
              {isLoading && <ActivityIndicator className="mr-2 h-4 w-4" />}
              Login
            </Button>
          </div>
        </form>
      </Form>
      <Toaster />
    </div>
  );
}
