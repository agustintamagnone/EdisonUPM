import React from 'react';
import Link from 'next/link';
import { IconSearch, IconBell } from '@/components/ui/Icons';

interface TopNavProps {
  activeTab?: 'pitch-board' | 'my-ideas' | 'none';
}

export function TopNav({ activeTab = 'pitch-board' }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-[#e4e9f0]">
      {/* 4px gold top strip */}
      <div className="h-[4px] w-full bg-[#e6c400]" />

      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-6 lg:px-[120px]">
        {/* Left: Logo + Nav tabs */}
        <div className="flex items-center gap-[32px]">
          <Link href="/" className="flex items-center gap-[10px] group">
            <img
              src="/assets/logo-primary.svg"
              alt="EDISON UPM"
              className="h-[34px] w-[38px] object-contain"
            />
            <span className="font-display text-[18px] font-extrabold tracking-[-0.4px] text-[#0f1b2d]">
              EDISON <span className="text-[#4865ff]">UPM</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-[4px]">
            <Link
              href="/pitch-board"
              className={`rounded-[8px] px-[14px] py-[8px] font-sans text-[14px] transition-colors ${
                activeTab === 'pitch-board'
                  ? 'bg-[#e8ebfe] font-semibold text-[#4865ff]'
                  : 'font-medium text-[#334155] hover:bg-[#f4f7fa] hover:text-[#0f1b2d]'
              }`}
            >
              Pitch Board
            </Link>
            <Link
              href="/ideas/wattwise"
              className={`rounded-[8px] px-[14px] py-[8px] font-sans text-[14px] transition-colors ${
                activeTab === 'my-ideas'
                  ? 'bg-[#e8ebfe] font-semibold text-[#4865ff]'
                  : 'font-medium text-[#334155] hover:bg-[#f4f7fa] hover:text-[#0f1b2d]'
              }`}
            >
              My Ideas
            </Link>
            <Link
              href="/pitch-board"
              className="rounded-[8px] px-[14px] py-[8px] font-sans text-[14px] font-medium text-[#334155] transition-colors hover:bg-[#f4f7fa] hover:text-[#0f1b2d]"
            >
              Mentors
            </Link>
            <Link
              href="/pitch-board"
              className="rounded-[8px] px-[14px] py-[8px] font-sans text-[14px] font-medium text-[#334155] transition-colors hover:bg-[#f4f7fa] hover:text-[#0f1b2d]"
            >
              Saved
            </Link>
          </nav>
        </div>

        {/* Right: Search box, Notification, Publish button, Avatar */}
        <div className="flex items-center gap-[14px]">
          <div className="hidden lg:flex h-[38px] w-[260px] items-center justify-between rounded-[10px] border border-[#e4e9f0] bg-[#f4f7fa] px-[12px] text-[#64748b]">
            <div className="flex items-center gap-[8px]">
              <IconSearch size={15} className="text-[#64748b]" />
              <span className="font-sans text-[13px] text-[#64748b]">
                Search ideas, tags, founders...
              </span>
            </div>
            <span className="rounded-[4px] border border-[#e4e9f0] bg-white px-[5px] py-[1px] font-sans text-[11px] font-medium text-[#64748b]">
              ⌘K
            </span>
          </div>

          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-[#e4e9f0] bg-white text-[#334155] transition-colors hover:bg-[#f4f7fa]"
          >
            <IconBell size={18} />
            <span className="absolute right-[8px] top-[8px] h-[7px] w-[7px] rounded-full bg-[#4865ff]" />
          </button>

          <Link
            href="/ideas/wattwise"
            title="Alejandra García · ETSII UPM"
            className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full font-display text-[13px] font-bold text-white shadow-sm"
            style={{
              backgroundImage: 'linear-gradient(135deg, #4865ff 0%, #00adcc 100%)',
            }}
          >
            AG
          </Link>
        </div>
      </div>
    </header>
  );
}
