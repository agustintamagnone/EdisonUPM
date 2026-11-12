import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white select-none">
      {/* Top Yellow Navigation Bar (#e6c400) — scales proportionally with viewport width */}
      <header className="relative z-20 flex h-[clamp(48px,4.765vw,90px)] w-full shrink-0 items-center justify-between bg-[#e6c400] px-[3.125%]">
        {/* Wordmark: EDISON (#0f1b2d) + UPM (white) */}
        <Link
          href="/"
          className="flex items-center gap-[0.47vw] font-display text-[clamp(16px,1.72vw,34px)] font-extrabold leading-none whitespace-nowrap"
        >
          <span className="tracking-[0.04em] text-[#0f1b2d]">EDISON</span>
          <span className="text-white">UPM</span>
        </Link>

        {/* Top Navigation Links & Dark Sign In Button */}
        <nav className="flex items-center gap-[2.5vw]">
          <Link
            href="/pitch-board"
            className="font-sans text-[clamp(12px,1.17vw,22px)] font-semibold text-[#0f1b2d] transition-opacity hover:opacity-75 whitespace-nowrap"
          >
            Pitch Board
          </Link>
          <Link
            href="/pitch-board"
            className="hidden sm:inline font-sans text-[clamp(12px,1.17vw,22px)] font-semibold text-[#0f1b2d] transition-opacity hover:opacity-75 whitespace-nowrap"
          >
            How it works
          </Link>
          <Link
            href="/pitch-board"
            className="hidden md:inline font-sans text-[clamp(12px,1.17vw,22px)] font-semibold text-[#0f1b2d] transition-opacity hover:opacity-75 whitespace-nowrap"
          >
            For investors
          </Link>
          <Link
            href="/pitch-board"
            className="inline-flex items-center justify-center rounded-[0.94vw] bg-[#0f1b2d] px-[1.56vw] py-[0.86vw] font-sans text-[clamp(12px,1.17vw,22px)] font-semibold leading-none text-white transition-colors hover:bg-[#1e293b] whitespace-nowrap"
          >
            Sign in
          </Link>
        </nav>
      </header>

      {/* Main Hero Stage — unified coordinate system so diagonal, lightbulb, and text never drift on zoom */}
      <main className="relative flex-1 w-full overflow-hidden bg-white">
        {/* Diagonal Royal Blue Triangle:
            Locked from bottom-left (0, 100) to top-right (92.5, 0) of <main>. */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <polygon points="0,0 92.5,0 0,100" fill="#4865FF" />
        </svg>

        {/* Left Side: Lightbulb Vector Composition scaled via SVG viewBox (497x492) so it stays inside the blue side at every zoom level */}
        <svg
          viewBox="0 0 497 492"
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-[12%] h-auto max-h-[64vh] w-[38.8vw]"
        >
          <foreignObject x="0" y="0" width="497" height="492">
            <div className="relative h-[492px] w-[497px]">
              {/* Node 2003:1159 — Vector 3 (Cone body) */}
              <div className="absolute left-0 top-0 flex h-[497px] w-[493.366px] items-center justify-center">
                <div className="flex-none rotate-[24.37deg] skew-x-[-3.34deg]">
                  <div className="relative h-[405.372px] w-[334.712px]">
                    <div className="absolute inset-[-0.42%_-1%_-2.11%_-1.1%]">
                      <img
                        alt=""
                        className="block h-full w-full max-w-none"
                        src="/assets/landing-vector3.svg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Node 2003:1160 — Vector 2 (Bottom base triangle) */}
              <div className="absolute left-[74.94px] top-[318.71px] flex h-[172.889px] w-[188.209px] items-center justify-center">
                <div className="flex-none rotate-[24.37deg] skew-x-[-3.34deg]">
                  <div className="relative h-[129.881px] w-[140.324px]">
                    <div className="absolute inset-[-7.94%_-10.12%_-11.97%_-9.79%]">
                      <img
                        alt=""
                        className="block h-full w-full max-w-none"
                        src="/assets/landing-vector2.svg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Node 2003:1161 — Subtract (Bulb head with filament cutout) */}
              <div className="absolute left-[220.21px] top-0 h-[257.313px] w-[276.795px]">
                <img
                  alt=""
                  className="absolute inset-0 block h-full w-full max-w-none"
                  src="/assets/landing-subtract.svg"
                />
              </div>

              {/* Node 2003:1164 — Vector 5 (Inner filament gradient) */}
              <div className="absolute left-[245px] top-[93px] h-[178px] w-[174px]">
                <div className="absolute inset-[-2.81%_-2.87%_-1.68%_-2.87%]">
                  <img
                    alt=""
                    className="block h-full w-full max-w-none"
                    src="/assets/landing-vector5.svg"
                  />
                </div>
              </div>
            </div>
          </foreignObject>
        </svg>

        {/* Right Side: Hero Copy Block locked to the white bottom-right triangle.
            At top=46%, the blue diagonal edge is at x = 92.5% * (1 - 0.46) = 49.95%.
            Starting at left=55.5% with width=41vw guarantees the text and buttons
            remain 100% inside the white side at all browser zoom levels. */}
        <div className="absolute left-[55.5%] top-[46%] z-10 flex w-[41vw] flex-col items-start gap-[1.4vw] select-text">
          <h1 className="font-display text-[3.55vw] font-extrabold leading-[1.1] text-[#0f1b2d]">
            <span>Where UPM ideas meet </span>
            <span className="text-[#4865ff]">their first believers</span>
            <span>.</span>
          </h1>

          <p className="font-sans text-[1.32vw] font-normal leading-[1.55] text-[#64748b]">
            Publish your idea, get honest feedback from peers and professors, and get
            discovered by investors looking for the next university startup.
          </p>

          <div className="flex flex-wrap items-start gap-[0.94vw] pt-[0.15vw]">
            <Link
              href="/pitch-board"
              className="inline-flex items-center justify-center rounded-[0.94vw] bg-[#4865ff] px-[1.875vw] py-[1.17vw] font-sans text-[1.17vw] font-semibold leading-none text-white transition-colors duration-150 hover:bg-[#3144aa] whitespace-nowrap"
            >
              Sign in with your UPM account
            </Link>

            <Link
              href="/pitch-board"
              className="inline-flex items-center justify-center rounded-[0.94vw] border-[1.5px] border-[#cbd5e1] bg-white px-[1.875vw] py-[1.17vw] font-sans text-[1.17vw] font-semibold leading-none text-[#0f1b2d] transition-colors duration-150 hover:border-[#0f1b2d] hover:bg-[#f4f7fa] whitespace-nowrap"
            >
              Explore ideas
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
