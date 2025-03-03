export const setCookie = (name: string, value: string, hours: number) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + hours * 60 * 60 * 1000);
    const secureFlag = window.location.protocol === "https:" ? "Secure;" : "";
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; ${secureFlag} SameSite=Strict`;
};

export const removeCookie = (name: string) => {
    const secureFlag = window.location.protocol === "https:" ? "Secure;" : "";
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; ${secureFlag} SameSite=Strict`;
};

export const getCookie = (name: string): string | null => {
    const cookies = document.cookie.split("; ");
    const authCookie = cookies.find((row) => row.startsWith(`${name}=`));
    return authCookie ? authCookie.split("=")[1] : null;
};

