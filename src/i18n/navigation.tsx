import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware Link/router — automatically prefixes paths with /hi or /en
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);