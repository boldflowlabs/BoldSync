'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const tabs = [
  { name: 'Overview', href: '', exact: true },
  { name: 'WhatsApp', href: '/waba' },
  { name: 'Billing', href: '/billing' },
  { name: 'Team', href: '/team' },
  { name: 'Automations', href: '/automations' },
  { name: 'n8n Services', href: '/n8n' },
  { name: 'Flows', href: '/flows' },
  { name: 'Activity', href: '/activity' },
];

export function ClientTabs({ orgId }: { orgId: string }) {
  const pathname = usePathname();
  const baseUrl = `/admin/clients/${orgId}`;

  return (
    <div className="border-b border-border">
      <ScrollArea className="w-full">
        <div className="flex w-max items-center gap-6 px-1">
          {tabs.map((tab) => {
            const href = `${baseUrl}${tab.href}`;
            const isActive = tab.exact 
              ? pathname === href 
              : pathname.startsWith(href);

            return (
              <Link
                key={tab.name}
                href={href}
                className={cn(
                  "flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 hover:text-foreground",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground"
                )}
              >
                {tab.name}
              </Link>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
