import { FeedbackCommentItem, FounderInfo, Idea, IndustryCategory } from "@/types";

export const DEMO_FOUNDER: FounderInfo = {
  name: "Alejandra García",
  initials: "AG",
  schoolAndYear: "ETSII · 3rd year",
  fullDegreeAndSchool: "Industrial Engineering · ETSII · 3rd year",
  bio: "Engineering student obsessed with energy and data. Looking to turn WattWise into a startup before graduating.",
};

export const INDUSTRY_CATEGORIES: IndustryCategory[] = [
  "Green Tech",
  "Software",
  "Hardware",
  "HealthTech",
  "EdTech",
  "Circular Economy",
  "AgriTech",
];

export const INITIAL_IDEAS: Idea[] = [
  {
    id: "idea-wattwise",
    slug: "wattwise",
    title: "WattWise",
    elevatorPitch:
      "Real-time energy dashboard that turns student residences into a friendly saving competition.",
    problemStatement:
      "Students in UPM residences pay a flat energy fee, so nobody sees — or cares about — how much they consume. Residences waste up to 30% of their energy heating empty rooms and powering devices left on standby.",
    description:
      "WattWise plugs into the residence’s existing smart meters and shows every floor its live consumption. Weekly challenges, rankings and gentle nudges turn saving energy into a game, while residence managers get a dashboard to spot waste and report savings.",
    industries: ["Green Tech", "Software"],
    stage: "MVP",
    stageLabel: "MVP live",
    coverImage: "/assets/wattwise-cover.png",
    mvpUrl: "https://wattwise.app/demo",
    metrics: [
      { id: "m-1", value: "180", label: "beta users" },
      { id: "m-2", value: "−12%", label: "energy in pilot" },
      { id: "m-3", value: "2", label: "pilot residences" },
    ],
    founder: DEMO_FOUNDER,
    lookingFor: [
      "Pricing feedback",
      "Pilot residences",
      "Seed funding",
      "Incubator spot",
    ],
    viewsCount: 1248,
    savesCount: 37,
    helpfulCount: 34,
    createdAt: "2026-10-20T10:00:00.000Z",
  },
];

export const INITIAL_COMMENTS: Record<string, FeedbackCommentItem[]> = {
  wattwise: [
    {
      id: "comment-wattwise-1",
      ideaSlug: "wattwise",
      authorName: "Prof. Pablo Martín",
      authorInitials: "PM",
      role: "Professor",
      timeLabel: "· 2h ago",
      comment:
        "Great traction for a first MVP. Have you validated that residence managers — not students — are the ones who would pay? I’d interview 5 of them before the next sprint.",
      helpfulCount: 8,
    },
  ],
};
