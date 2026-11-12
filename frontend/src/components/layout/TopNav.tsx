'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthControls } from '@/components/auth/AuthControls';
import { useAuth } from '@/components/auth/AuthProvider';
import { IconSearch } from '@/components/ui/Icons';

const tabs = [
  { id: 'pitch-board', label: 'Pitch Board' },
  { id: 'my-ideas', label: 'My Ideas' },
  { id: 'saved', label: 'Saved' },
] as const;

interface TopNavProps {
  activeTab?: (typeof tabs)[number]['id'] | 'none';
}

export function TopNav({ activeTab = 'none' }: TopNavProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e4e9f0] bg-white">
      <div className="h-[4px] w-full bg-[#e6c400]" />

      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-2 px-4 sm:px-6 md:flex-nowrap md:gap-x-6 xl:px-[120px]">
        <Link href="/" className="order-1 flex min-h-[56px] shrink-0 items-center gap-2.5 md:min-h-[68px]">
          <Image src="/assets/logo-primary.svg" width={38} height={34} alt="" className="h-[34px] w-[38px] object-contain" />
          <span className="font-display text-[18px] font-extrabold tracking-[-0.4px] text-[#0f1b2d]">
            EDISON <span className="text-[#4865ff]">UPM</span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="order-3 flex w-full items-center gap-1 border-t border-[#e4e9f0] py-1 md:order-2 md:w-auto md:flex-1 md:border-0 md:py-0">
          {tabs.filter((tab) => tab.id === 'pitch-board' || user).map((tab) => (
            <Link key={tab.id} href={`/${tab.id}`} aria-current={pathname === `/${tab.id}` ? 'page' : activeTab === tab.id ? 'location' : undefined}
              className={`flex min-h-10 items-center whitespace-nowrap rounded-[8px] px-3 font-sans text-[14px] transition-colors ${activeTab === tab.id
                ? 'bg-[#e8ebfe] font-semibold text-[#4865ff]'
                : 'font-medium text-[#334155] hover:bg-[#f4f7fa] hover:text-[#0f1b2d]'}`}>
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="order-2 flex shrink-0 items-center gap-2 sm:gap-[14px] md:order-3">
          <Link href="/pitch-board#idea-search" className="hidden h-[38px] w-[170px] items-center gap-2 rounded-[10px] border border-[#e4e9f0] bg-[#f4f7fa] px-3 text-[#64748b] lg:flex 2xl:w-[260px]">
            <IconSearch size={15} className="shrink-0" />
            <span className="truncate font-sans text-[13px]">Search ideas</span>
          </Link>
          <AuthControls />
        </div>
      </div>
    </header>
  );
}
