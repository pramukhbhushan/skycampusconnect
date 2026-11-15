import Link from "next/link";
import { ArrowRight, Bell, Calculator, ChatBubble, ListCheck } from "@/components/icons";
import { Logo } from "@/components/ui";
import { STEP_OVERVIEW } from "@/lib/steps";

const pill = "inline-flex items-center justify-center rounded-full font-semibold no-underline";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="border-b border-line-2 bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-8 py-[18px]">
          <Link href="/" aria-label="SKY Campus Connect home" className="flex items-center gap-3.5 no-underline">
            <Logo className="h-10" />
            <span className="border-l border-line pl-3.5 text-[13px] font-semibold tracking-[0.08em] text-brand uppercase">
              Connect
            </span>
          </Link>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-7 text-[15px] font-medium">
            <a href="#how" className="text-ink-soft no-underline">How it works</a>
            <a href="#views" className="text-ink-soft no-underline">Organizers &amp; admins</a>
            <Link href="/login" className={`${pill} min-h-11 bg-brand px-[22px] text-white hover:text-white`}>
              Log in
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-hero">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-8 pt-20 pb-[88px]">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-6">
            <span className="self-start rounded-full border border-line bg-white px-3.5 py-2 text-[13px] font-semibold tracking-[0.06em] text-brand uppercase">
              For SKY Campus organizers
            </span>
            <h1 className="text-[56px] leading-[1.05] font-bold tracking-[-0.02em] max-sm:text-4xl">
              Plan your campus meditation retreat, one clear step at a time.
            </h1>
            <p className="max-w-[34em] text-[19px] leading-[1.55] text-body">
              We&apos;re excited you&apos;re bringing SKY to your campus. Set up your course, get funding approved, request
              quotes and invoices, and close it out in one place instead of a pile of separate forms.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/login" className={`${pill} min-h-[52px] gap-2.5 bg-brand px-7 text-base text-white hover:text-white`}>
                Get started <ArrowRight />
              </Link>
              <a href="#how" className={`${pill} min-h-[52px] border border-chip bg-white px-[26px] text-base text-ink hover:text-ink`}>
                See how it works
              </a>
            </div>
          </div>

          <div className="flex min-w-0 flex-[1_1_440px] flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-[0_24px_60px_-30px_rgba(26,64,150,0.35)]">
            <div className="flex items-center gap-3 border-b border-line-3 px-[22px] py-[18px]">
              <div className="flex size-9 items-center justify-center rounded-full bg-brand-bright text-white">
                <ChatBubble />
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-semibold">Course planning assistant</span>
                <span className="text-[13px] text-muted">Tell it about your retreat and it sets up your steps</span>
              </div>
            </div>
            <div className="flex flex-col gap-3.5 bg-faint p-[22px] text-[15px] leading-normal">
              <div className="max-w-[86%] self-start rounded-[16px_16px_16px_4px] bg-tint px-4 py-3">
                Hi! What kind of retreat are you planning, and where?
              </div>
              <div className="max-w-[86%] self-end rounded-[16px_16px_4px_16px] bg-brand px-4 py-3 text-white">
                A SKY Happiness Retreat at University of Maryland in March, about 14 students. The university is funding it.
              </div>
              <div className="flex max-w-[86%] flex-col gap-2.5 self-start rounded-[16px_16px_16px_4px] bg-tint px-4 py-3">
                <span>
                  Great. Since it&apos;s university-funded, you&apos;ll need funding approval before the invoice. I&apos;ve set
                  up your 8 steps and pre-filled what I can.
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {["1 · Campus requirements", "3 · Funding approval", "4 · Invoice"].map((t) => (
                    <span key={t} className="rounded-full border border-chip bg-white px-2.5 py-1 text-[13px] font-semibold text-brand">
                      {t}
                    </span>
                  ))}
                </span>
              </div>
            </div>
            <form className="flex gap-2.5 border-t border-line-3 px-[18px] py-4">
              <label htmlFor="hero-chat" className="sr-only">Tell us about your retreat</label>
              <input
                id="hero-chat"
                type="text"
                placeholder="Tell us about your retreat…"
                className="min-h-[46px] min-w-0 flex-1 rounded-full border border-chip bg-white px-[18px] text-[15px] text-ink"
              />
              <button
                type="button"
                aria-label="Send message"
                className="flex size-[46px] cursor-pointer items-center justify-center rounded-full bg-brand text-white"
              >
                <ArrowRight />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section id="how" className="bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-8 py-[88px]">
          <div className="flex max-w-[720px] flex-col gap-3">
            <span className="text-[13px] font-semibold tracking-[0.08em] text-brand uppercase">How setting up a course works</span>
            <h2 className="text-[40px] leading-[1.1] font-bold tracking-[-0.01em]">Eight steps from first idea to a closed course</h2>
            <p className="text-lg leading-[1.55] text-body">
              A progress bar follows you through each one. Steps that don&apos;t apply to your course, like funding approval
              for a student-paid retreat, are skipped for you.
            </p>
          </div>
          <ol className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
            {STEP_OVERVIEW.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-2.5 rounded-[18px] border border-line bg-white p-[22px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex size-9 items-center justify-center rounded-full bg-tint text-base font-bold text-brand">
                    {i + 1}
                  </span>
                  <span className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">{s.phase}</span>
                </div>
                <h3 className="text-lg leading-[1.3] font-semibold">{s.title}</h3>
                <p className="text-[15px] leading-normal text-body">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-hero">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-8 px-8 py-[72px]">
          {[
            { icon: <ListCheck size={28} />, title: "Enter it once", text: "Your campus, dates, Journey ID and client details carry over to the funding, quote and invoice forms. You just confirm." },
            { icon: <Calculator size={28} />, title: "Pricing worked out for you", text: "$500 Happiness or $1,000 Premium for up to 10 students, plus $100 per extra student, plus 3% if paying by card." },
            { icon: <Bell size={28} />, title: "Reminders before things slip", text: "A nudge to request your invoice when the course starts, and to submit course accounting once it ends." },
          ].map((b) => (
            <div key={b.title} className="flex flex-col gap-2.5">
              <span className="text-brand">{b.icon}</span>
              <h3 className="text-xl font-semibold">{b.title}</h3>
              <p className="text-base leading-[1.55] text-body">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Two views */}
      <section id="views" className="bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-9 px-8 py-[88px]">
          <div className="flex max-w-[720px] flex-col gap-3">
            <span className="text-[13px] font-semibold tracking-[0.08em] text-brand uppercase">Two views, one workflow</span>
            <h2 className="text-[40px] leading-[1.1] font-bold tracking-[-0.01em]">Built for organizers and the IAHV team</h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-5">
            <div className="flex flex-col gap-4 rounded-3xl bg-brand p-8 text-white">
              <span className="text-[13px] font-semibold tracking-[0.08em] text-[#d6e3ff] uppercase">Organizer</span>
              <h3 className="text-[26px] font-bold">Run your retreat without chasing forms</h3>
              <ul className="flex list-disc flex-col gap-2 pl-5 text-base leading-normal">
                <li>Talk through your plan and get your steps set up</li>
                <li>See every course with its progress bar and next action</li>
                <li>Fill pre-filled forms for funding, quotes and invoices</li>
              </ul>
            </div>
            <div className="flex flex-col gap-4 rounded-3xl border border-chip bg-white p-8">
              <span className="text-[13px] font-semibold tracking-[0.08em] text-brand uppercase">IAHV Admin</span>
              <h3 className="text-[26px] font-bold">Every course across campuses, live</h3>
              <ul className="flex list-disc flex-col gap-2 pl-5 text-base leading-normal text-ink-soft">
                <li>Filter by campus, step or status; spot overdue courses</li>
                <li>Approve funding and enter quote and invoice numbers</li>
                <li>Send reminder emails to one course or many at once</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white px-8 pb-[88px]">
        <div className="mx-auto flex max-w-[1136px] flex-wrap items-center justify-between gap-6 rounded-[28px] bg-brand-bright px-12 py-14 max-sm:px-6">
          <div className="flex flex-[1_1_420px] flex-col gap-2.5 text-white">
            <h2 className="text-4xl leading-[1.15] font-bold">Ready to plan your retreat?</h2>
            <p className="text-lg leading-normal">Log in with your campus email to set up your first course.</p>
          </div>
          <Link href="/login" className={`${pill} min-h-[52px] bg-white px-[30px] text-base font-bold text-brand-dark`}>
            Log in to get started
          </Link>
        </div>
      </section>

      <footer className="bg-ink">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-5 px-8 py-10">
          <Logo variant="white" className="h-[34px]" />
          <p className="text-sm text-[#c9d4ea]">SKY Campus Connect · a course planning tool for SKY Campus organizers and IAHV</p>
        </div>
      </footer>
    </div>
  );
}
