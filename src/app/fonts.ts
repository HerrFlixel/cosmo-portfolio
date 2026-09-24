import { Archivo, Bodoni_Moda, Martian_Mono } from "next/font/google";

// Werden beim Build geladen und selbst ausgeliefert: zur Laufzeit keine Anfrage an Google.
export const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-bodoni",
  display: "swap",
});

export const archivo = Archivo({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const martian = Martian_Mono({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-martian",
  display: "swap",
});

export const fontVariables = `${bodoni.variable} ${archivo.variable} ${martian.variable}`;
