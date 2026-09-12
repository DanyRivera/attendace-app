import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Margo Papelería | Checador de asistencia",
  description: "Registro de asistencias, salidas y jornadas de Margo Papelería.",
  applicationName: "Margo Papelería",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Margo Papelería",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${poppins.variable} antialiased`}
    >
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              success: "!bg-primary !text-white !border-primary",
              error: "!bg-danger !text-white !border-danger",
              toast: "!rounded-2xl !shadow-xl",
              title: "!font-semibold",
            },
          }}
        />
      </body>
    </html>
  );
}
