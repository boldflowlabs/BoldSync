"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useOrg } from "@/components/org-provider";
import { useTotalUnread } from "@/hooks/use-total-unread";
import { useTheme } from "@/hooks/use-theme";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  GitBranch,
  Radio,
  Zap,
  Settings,
  LogOut,
  Moon,
  Sun,
  User,
  Building2,
  Check,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/pipelines", label: "Pipelines", icon: GitBranch },
  { href: "/broadcasts", label: "Broadcasts", icon: Radio },
  { href: "/automations", label: "Automations", icon: Zap },
];

export function FloatingDock() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const { orgs, activeOrganizationId, setActiveOrganizationId } = useOrg();
  const totalUnread = useTotalUnread();
  const { theme, setTheme } = useTheme();

  const activeOrganization = orgs.find((w) => w.id === activeOrganizationId);

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    "U";

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-none">
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-full glass shadow-xl"
      >
        <Link href="/dashboard" className="mr-2 flex items-center gap-2 pl-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <Zap className="h-4 w-4" />
          </div>
        </Link>

        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const showUnreadDot = item.href === "/inbox" && totalUnread > 0;

          return (
            <Link key={item.href} href={item.href} className="relative">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative flex h-10 px-3 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-black/20"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="dock-indicator"
                    className="absolute inset-0 rounded-full bg-primary shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:block">{item.label}</span>
                </span>
                {showUnreadDot && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 z-20">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background" />
                  </span>
                )}
              </motion.div>
            </Link>
          );
        })}

        <div className="w-px h-6 bg-border mx-1" />

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-black/20 transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </motion.button>

        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none px-3 h-10 flex items-center gap-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20 transition-colors text-sm font-medium">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="hidden sm:block max-w-[120px] truncate">
              {activeOrganization?.name || "Organization"}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass mt-4 border-border/50 shadow-2xl rounded-2xl">
            <div className="p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Organizations
            </div>
            {orgs.map((ws) => (
              <DropdownMenuItem 
                key={ws.id}
                onClick={() => setActiveOrganizationId(ws.id)}
                className="rounded-xl cursor-pointer py-2 px-3 flex items-center justify-between"
              >
                <span className="truncate">{ws.name}</span>
                {ws.id === activeOrganizationId && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem className="rounded-xl cursor-pointer p-0">
              <Link href="/settings/team" className="flex w-full items-center px-3 py-2 text-muted-foreground hover:text-foreground">
                <Users className="mr-2 h-4 w-4" />
                <span>Team Settings</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-border mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none pl-1 pr-1.5 py-1 flex items-center rounded-full hover:bg-white/10 dark:hover:bg-black/20 transition-colors">
            <Avatar className="size-8 rounded-full border border-border shadow-sm">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} />
              ) : null}
              <AvatarFallback className="bg-primary/20 text-primary">{initial}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass mt-4 border-border/50 shadow-2xl rounded-2xl">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                {profile?.full_name && (
                  <p className="font-medium text-sm">{profile.full_name}</p>
                )}
                {profile?.email && (
                  <p className="w-[200px] truncate text-xs text-muted-foreground">
                    {profile.email}
                  </p>
                )}
              </div>
            </div>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem className="rounded-xl cursor-pointer p-0">
              <Link href="/settings" className="flex w-full items-center px-2 py-1.5 text-muted-foreground hover:text-foreground">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            
            {profile?.role === 'super_admin' && (
              <>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem className="rounded-xl cursor-pointer p-0">
                  <Link href="/admin" className="flex w-full items-center px-2 py-1.5 text-amber-500 hover:text-amber-400">
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    <span>Super Admin</span>
                  </Link>
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem onClick={() => signOut()} className="rounded-xl cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </motion.div>
    </div>
  );
}
