"use client";

import { useMemo, useState } from "react";
import { Mail, MessageSquareText, Phone } from "lucide-react";

type OutreachLead = {
  business: string;
  niche: string | null;
  website: string | null;
  issueFound: string | null;
  priority: string;
  notes: string | null;
  sourceLinks: string | null;
};

type DraftType = "email" | "call" | "follow-up";

type NicheCopy = {
  label: string;
  customerDetails: string;
  callDetails: string;
};

const nicheCopies: Array<{ terms: string[]; copy: NicheCopy }> = [
  {
    terms: ["floor", "flooring"],
    copy: {
      label: "flooring",
      customerDetails:
        "your flooring services, photos of past jobs, contact info, service area, and what you offer",
      callDetails:
        "your flooring services, photos of past jobs, contact info, service area, and anything that helps new customers trust the work faster",
    },
  },
  {
    terms: ["barber", "barbershop", "hair", "cuts"],
    copy: {
      label: "barbershop",
      customerDetails:
        "your services, hours, booking info, photos, location, and what you offer",
      callDetails:
        "your services, hours, booking info, photos, location, and anything that helps someone decide to come in",
    },
  },
  {
    terms: ["restaurant", "cafe", "grill", "kitchen", "food"],
    copy: {
      label: "restaurant",
      customerDetails:
        "your menu, hours, photos, location, contact info, and what you offer",
      callDetails:
        "your menu, hours, photos, location, ordering or catering info if relevant, and anything that helps people choose you",
    },
  },
  {
    terms: ["detail", "detailing", "auto spa", "car wash"],
    copy: {
      label: "auto detailing",
      customerDetails:
        "your services, packages, before-and-after photos, contact info, service area, and what you offer",
      callDetails:
        "your services, packages, before-and-after photos, service area, and anything that helps customers understand the value",
    },
  },
  {
    terms: ["bakery", "cakes", "cupcakes", "bakes"],
    copy: {
      label: "bakery",
      customerDetails:
        "your menu, hours, photos, location, catering info if relevant, and what you offer",
      callDetails:
        "your menu, hours, photos, location, catering info if relevant, and anything that helps people know what they can order",
    },
  },
  {
    terms: ["salon", "beauty", "lashes", "nails", "brows"],
    copy: {
      label: "beauty",
      customerDetails:
        "your services, photos, hours, booking info, location, and what you offer",
      callDetails:
        "your services, photos, hours, booking info, location, and anything that helps someone feel comfortable booking",
    },
  },
];

function businessName(lead: OutreachLead) {
  return lead.business?.trim() || "your business";
}

function nicheCopy(lead: OutreachLead): NicheCopy {
  const source = `${lead.niche ?? ""} ${lead.business ?? ""} ${lead.notes ?? ""}`.toLowerCase();

  return (
    nicheCopies.find((item) => item.terms.some((term) => source.includes(term)))
      ?.copy ?? {
      label: lead.niche?.trim().toLowerCase() || "small business",
      customerDetails:
        "your services, photos, contact info, location, and what you offer",
      callDetails:
        "your services, photos, contact info, service area, and anything that helps new customers trust you faster",
    }
  );
}

function issueContext(lead: OutreachLead) {
  return `${lead.issueFound ?? ""} ${lead.notes ?? ""} ${lead.sourceLinks ?? ""}`.toLowerCase();
}

function isInstagramOrNoWebsiteLead(lead: OutreachLead) {
  const context = issueContext(lead);
  const website = lead.website?.trim().toLowerCase();

  return (
    context.includes("no dedicated website") ||
    context.includes("relies mainly on instagram") ||
    context.includes("instagram") ||
    website === "not found" ||
    !website
  );
}

function naturalEmailObservation(lead: OutreachLead) {
  const name = businessName(lead);
  const context = issueContext(lead);

  if (
    context.includes("no dedicated website") ||
    context.includes("relies mainly on instagram") ||
    context.includes("instagram")
  ) {
    return `I came across your Instagram and couldn't find a dedicated website for the business. I thought there might be a good opportunity to give ${name} a stronger online presence beyond Instagram.`;
  }

  if (context.includes("square")) {
    return "I noticed the site works for the basics, but it still feels pretty template-based and uses a default Square-style setup.";
  }

  if (context.includes("one-page") || context.includes("contact form")) {
    return "I noticed the site is mostly a simple one-page contact form right now, so there may be room to make it feel more complete and better show what you offer.";
  }

  if (context.includes("outdated") || context.includes("dated")) {
    return "I noticed the site has the basics, but the overall design feels a little dated and could make a stronger first impression.";
  }

  if (context.includes("cluttered") || context.includes("repetitive")) {
    return "I noticed the site has good content, but the layout feels a little cluttered and could be organized more clearly.";
  }

  if (context.includes("wix") || context.includes("godaddy") || context.includes("template")) {
    return "I noticed the site works for the basics, but it feels pretty template-based and could be made more tailored to the business.";
  }

  if (context.includes("thin") || context.includes("sparse")) {
    return "I noticed the online presence has the basics, but it could use a bit more depth to help customers understand the business quickly.";
  }

  return "I thought there might be a good opportunity to make the online presence feel a little more polished and easier for customers to use.";
}

function callOpeningObservation(lead: OutreachLead) {
  const context = issueContext(lead);

  if (isInstagramOrNoWebsiteLead(lead)) {
    return "I came across your Instagram, and first off, the work looks really solid.\n\nI just had a quick question. Do you guys have a dedicated website right now, or are you mostly using Instagram and word of mouth?";
  }

  if (context.includes("square")) {
    return "I noticed the site works for the basics, but it still feels pretty template-based and uses a default Square-style setup.";
  }

  if (context.includes("one-page") || context.includes("contact form")) {
    return "I noticed the site is mostly just a simple one-page contact form right now, so I wanted to ask if you have ever thought about making it feel more complete.";
  }

  if (context.includes("outdated") || context.includes("dated")) {
    return "I noticed the site has the basics, but the overall design feels a little dated and could probably make a stronger first impression.";
  }

  if (context.includes("cluttered") || context.includes("repetitive")) {
    return "I noticed the site has good content, but the layout feels a little cluttered and could probably be organized more clearly.";
  }

  return "I was looking at your online presence and thought there might be a simple opportunity to make it feel more polished and easier for customers to use.";
}

function buildEmail(lead: OutreachLead) {
  const name = businessName(lead);
  const details = nicheCopy(lead).customerDetails;
  const niche = nicheCopy(lead).label;
  const observation = naturalEmailObservation(lead);

  if (isInstagramOrNoWebsiteLead(lead)) {
    return `Subject: Quick website idea for ${name}

Hi ${name} team,

I came across your Instagram and the work looks really solid. I couldn't find a dedicated website for the business, so I thought there might be a good opportunity to give ${name} a stronger online presence beyond Instagram.

For a ${niche} business, a clean website could make it easier for people to see your work, understand your services, and reach out directly.

I'm from BuiltBetter, and we build custom websites for small businesses that feel more professional, more tailored, and easier to use on mobile.

If you'd be open to it, I'd be happy to put together a free mock-up so you can see what a website for ${name} could look like before deciding on anything.

Let me know what you think.

Best,
Sami

BuiltBetter`;
  }

  return `Subject: Quick website idea for ${name}

Hi ${name} team,

I came across ${name} and took a look at your online presence. ${observation}

I think there's a good opportunity to make the business feel more polished online and give customers a clearer place to see ${details}.

I'm from BuiltBetter, and we build custom websites for small businesses that feel more professional, more tailored, and easier to use on mobile.

If you'd be open to it, I'd be happy to put together a free mock-up so you can see what an updated version could look like before deciding on anything.

Let me know what you think.

Best,
Sami

BuiltBetter`;
}

function buildCallScript(lead: OutreachLead) {
  const name = businessName(lead);
  const niche = nicheCopy(lead);
  const observation = callOpeningObservation(lead);

  if (isInstagramOrNoWebsiteLead(lead)) {
    return `Opening:
"Hi, is this ${name}?

My name's Sami, I'm with BuiltBetter. ${observation}"

If they say no:
"Got you, that's honestly why I was calling. I think for a ${niche.label} business especially, there's a good opportunity to have a clean website where people can see ${niche.customerDetails} and get a better feel for the business right away.

I'd be happy to put together a free mock-up so you can see what something like that could look like. Would you be open to that?"

If they say yes:
"Got you. I only asked because I couldn't find one right away. If you want, I'd still be happy to take a look and show you a free mock-up of a more polished direction."

Common objections:
If they use Instagram/Facebook/Google Maps:
"Yeah totally, and that definitely helps. I just mean having your own site too, so customers have one clear place to see everything directly from the business instead of only relying on third-party pages."

If they ask what would be on it:
"Mainly the stuff people already want to see before reaching out, like ${niche.callDetails}."

If they ask about cost:
"It depends on what you'd want built, so I wouldn't want to throw out a random number before showing you anything. That's why I'd rather start with the free mock-up first."

If they say email me:
"Yeah absolutely, what's the best email to send it to?"

If not interested:
"No worries at all. I appreciate your time."`;
  }

  return `Opening:
"Hi, is this ${name}?

My name's Sami, I'm with BuiltBetter. I was taking a look at your online presence and had a quick website idea."

Business problem:
"${observation} I think there could be a good opportunity to make it feel more polished and easier for customers to find what they need."

Ask:
"I'd be happy to put together a free mock-up so you can see what an updated version could look like. Would you be open to that?"

Common objections:
If they already have a website:
"Totally, and I'm not saying you need to replace it. I can just show a free mock-up of a more polished direction, and you can decide if it's useful."

If they use Instagram/Facebook/Google Maps:
"Yeah totally, and that definitely helps. I just mean having your own site too, so customers have one clear place to see everything directly from the business instead of only relying on third-party pages."

If they ask what would be on it:
"Mainly the stuff people already want to see before reaching out, like ${niche.callDetails}."

If they ask about cost:
"It depends on what you'd want built, so I wouldn't want to throw out a random number before showing you anything. That's why I'd rather start with the free mock-up first."

If they say email me:
"Yeah absolutely, what's the best email to send it to?"

If not interested:
"No worries at all. I appreciate your time."`;
}

function buildFollowUp(lead: OutreachLead) {
  const name = businessName(lead);

  return `Hey, this is Sami from BuiltBetter. Just following up on the website idea for ${name}. I'd still be happy to put together a free mock-up if you'd be open to taking a look. No pressure either way.`;
}

export function OutreachTools({ lead }: { lead: OutreachLead }) {
  const drafts = useMemo(
    () => ({
      email: buildEmail(lead),
      call: buildCallScript(lead),
      "follow-up": buildFollowUp(lead),
    }),
    [lead],
  );
  const [draftType, setDraftType] = useState<DraftType>("email");
  const [draftText, setDraftText] = useState(drafts.email);

  function selectDraft(type: DraftType) {
    setDraftType(type);
    setDraftText(drafts[type]);
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-300">
          Outreach helper
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">Draft generator</h2>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => selectDraft("email")}
          className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${
            draftType === "email"
              ? "border-cyan-300 bg-cyan-300/10 text-cyan-100"
              : "border-cyan-500/40 text-cyan-100 hover:border-cyan-300 hover:bg-cyan-300/10"
          }`}
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          Cold email draft
        </button>
        <button
          type="button"
          onClick={() => selectDraft("call")}
          className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${
            draftType === "call"
              ? "border-cyan-300 bg-cyan-300/10 text-cyan-100"
              : "border-cyan-500/40 text-cyan-100 hover:border-cyan-300 hover:bg-cyan-300/10"
          }`}
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          Cold call script
        </button>
        <button
          type="button"
          onClick={() => selectDraft("follow-up")}
          className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${
            draftType === "follow-up"
              ? "border-cyan-300 bg-cyan-300/10 text-cyan-100"
              : "border-cyan-500/40 text-cyan-100 hover:border-cyan-300 hover:bg-cyan-300/10"
          }`}
        >
          <MessageSquareText className="h-4 w-4" aria-hidden="true" />
          Follow-up message
        </button>
      </div>

      <textarea
        value={draftText}
        onChange={(event) => setDraftText(event.target.value)}
        className="mt-4 min-h-[360px] w-full resize-y rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-sm leading-6 text-slate-100 outline-none transition focus:border-cyan-300"
      />
    </section>
  );
}
