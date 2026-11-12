import Image from 'next/image';
import Link from 'next/link';
import { AuthControls, SignInLink } from '@/components/auth/AuthControls';

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-white">
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
        <nav aria-label="Main navigation" className="flex items-center gap-3 md:gap-[2.5vw]">
          <Link
            href="/pitch-board"
            className="font-sans text-[clamp(12px,1.17vw,22px)] font-semibold text-[#0f1b2d] transition-opacity hover:opacity-75 whitespace-nowrap"
          >
            Pitch Board
          </Link>
          <AuthControls variant="landing" />
        </nav>
      </header>

      {/* Main Hero Stage — unified coordinate system so diagonal, lightbulb, and text never drift on zoom */}
      <main className="relative flex w-full flex-1 flex-col overflow-hidden bg-white md:min-h-[max(540px,37.5vw)]">
        <div aria-hidden="true" className="relative h-[clamp(180px,54vw,330px)] shrink-0 md:absolute md:inset-0 md:h-full">
        {/* Diagonal Royal Blue Triangle:
            Locked from bottom-left (0, 100) to top-right (92.5, 0) of <main>. */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
        >
          <polygon points="0,0 92.5,0 0,100" fill="#4865FF" />
        </svg>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full md:hidden">
          <polygon points="0,0 100,0 100,62 0,100" fill="#4865FF" />
        </svg>

        {/* Left Side: Lightbulb Vector Composition scaled via SVG viewBox (497x492) so it stays inside the blue side at every zoom level */}
        <svg
          viewBox="0 0 497 492"
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 h-[95%] w-[68%] md:top-[12%] md:h-auto md:max-h-[64vh] md:w-[38.8vw]"
        >
          <foreignObject x="0" y="0" width="497" height="492">
            <div className="relative h-[492px] w-[497px]">
              {/* Node 2003:1159 — Vector 3 (Cone body) */}
              <div className="absolute left-0 top-0 flex h-[497px] w-[493.366px] items-center justify-center">
                <div className="flex-none rotate-[24.37deg] skew-x-[-3.34deg]">
                  <div className="relative h-[405.372px] w-[334.712px]">
                    <div className="absolute inset-[-0.42%_-1%_-2.11%_-1.1%]">
                      <Image width={342} height={416}
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
                      <Image width={168} height={156}
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
                <Image width={277} height={257}
                  alt=""
                  className="absolute inset-0 block h-full w-full max-w-none"
                  src="/assets/landing-subtract.svg"
                />
              </div>

              {/* Node 2003:1164 — Vector 5 (Inner filament gradient) */}
              <div className="absolute left-[245px] top-[93px] h-[178px] w-[174px]">
                <div className="absolute inset-[-2.81%_-2.87%_-1.68%_-2.87%]">
                  <Image width={184} height={186}
                    alt=""
                    className="block h-full w-full max-w-none"
                    src="/assets/landing-vector5.svg"
                  />
                </div>
              </div>
            </div>
          </foreignObject>
        </svg>
        </div>

        {/* Hero copy flows below the artwork on mobile and sits in the white area on desktop. */}
        <div className="relative z-10 flex flex-col items-start gap-4 px-5 pb-8 pt-3 sm:px-8 md:absolute md:left-[55.5%] md:top-[46%] md:w-[41vw] md:gap-[1.4vw] md:p-0">
          <h1 className="font-display text-[clamp(30px,8vw,48px)] font-extrabold leading-[1.1] text-[#0f1b2d] md:text-[clamp(28px,3.55vw,68px)]">
            <span>Where UPM ideas meet </span>
            <span className="text-[#4865ff]">their first believers</span>
            <span>.</span>
          </h1>

          <p className="font-sans text-base font-normal leading-[1.55] text-[#64748b] md:text-[clamp(13px,1.32vw,24px)]">
            Publish your idea, get honest feedback from peers and professors, and get
            discovered by investors looking for the next university startup.
          </p>

          <div className="flex flex-wrap items-start gap-2.5 md:gap-[0.94vw] md:pt-[0.15vw]">
            <SignInLink
              className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#4865ff] px-4 py-3 text-center font-sans text-sm font-semibold leading-none text-white transition-colors duration-150 hover:bg-[#3144aa] md:rounded-[0.94vw] md:px-[1.875vw] md:py-[1.17vw] md:text-[clamp(12px,1.17vw,22px)]"
            >
              Sign in with your UPM account
            </SignInLink>

            <Link
              href="/pitch-board"
              className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[10px] border-[1.5px] border-[#cbd5e1] bg-white px-4 py-3 font-sans text-sm font-semibold leading-none text-[#0f1b2d] transition-colors duration-150 hover:border-[#0f1b2d] hover:bg-[#f4f7fa] md:rounded-[0.94vw] md:px-[1.875vw] md:py-[1.17vw] md:text-[clamp(12px,1.17vw,22px)]"
            >
              Explore ideas
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
