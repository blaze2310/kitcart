import type { Metadata } from "next";
import Image from "next/image";
import { MarketplaceLink } from "@/features/shop/marketplace/marketplace-shell";
import styles from "./about.module.css";

export const metadata: Metadata = { title: "About KitCart" };

export default function AboutPage() {
  return (
    <main className={styles.page}>
<header className={styles.hero}>
  <div className={styles.heroCopy}>
    <h1>{"About KitCart"}</h1>
    <p className={styles.heroLine}>{"Every big idea starts small."}</p>
    <div className={styles.lead}><p>{"Every extraordinary creation begins somewhere."}</p>
<p>{"Sometimes, it starts with a simple thought. An idea for a website, a business, a design, or something that doesn't even exist yet."}</p>
<p>{"Other times, it begins with someone who has already created something remarkable but hasn't found the right audience for it."}</p>
<p>{"At KitCart, we believe both deserve an opportunity."}</p>
<p><strong>{"The person with an idea deserves the tools to build it. And the person who creates those tools deserves a platform to share them with the world."}</strong></p>
<p>{"That's the idea behind KitCart."}</p>
<p>{"A digital marketplace bringing creators and ideas together."}</p>
<blockquote className={styles.quote}>{"From a Dot to a Star."}</blockquote></div>
  </div>
  <div className={styles.art} aria-hidden="true">
    <div className={styles.orbit} />
    <div className={styles.logoPlate}>
      <Image src="/kitcart-brand/kitcart-lockup.webp" width={450} height={165} alt="" unoptimized />
    </div>
  </div>
</header>
<section className={styles.section} aria-labelledby="section-12">
  <header className={styles.heading}>
    <h2 id="section-12">{"Our Story"}</h2>
    <p className={styles.subtitle}>{"Three friends. One idea. Countless possibilities."}</p>
  </header>
  <div className={styles.story}>
<p>{"KitCart began with three friends — Garv, Rishabh, and Adit — and a shared ambition to build something meaningful."}</p>
<p>{"We recognized an interesting opportunity in the digital world."}</p>
<p>{"On one side, there are people with incredible ideas who often lack the right tools, resources, or technical skills to bring them to life."}</p>
<p>{"On the other side, there are talented developers, designers, creators, and innovators producing valuable digital products."}</p>
<p>{"But building something useful and finding people who need it are two different challenges."}</p>
<p><strong>{"What if we could bring both sides together?"}</strong></p>
<p>{"A place where someone looking for a ready-made website template could discover a developer’s work."}</p>
<p>{"Where an entrepreneur could find an automation created by someone halfway across the world."}</p>
<p>{"Where an independent creator could transform their knowledge, creativity, and technical skills into digital products that reach a wider audience."}</p>
<p>{"That's what we're building."}</p>
<p>{"Not simply another website to buy and sell files, but a marketplace where one person's creation can become another person's starting point."}</p>
<p>{"We're three friends at the beginning of our own entrepreneurial journey, working toward a platform that helps other people move forward on theirs."}</p>
<p>{"And just like our logo, we're starting with a dot of our own."}</p>
</div>
</section>
<section className={styles.section} aria-labelledby="section-27">
  <header className={styles.heading}>
    <h2 id="section-27">{"Why KitCart?"}</h2>
    <p className={styles.subtitle}>{"Everything you need. Everything you can create."}</p>
  </header>
  <p>{"Our name brings together two simple ideas."}</p><div className={styles.two}>
<article className={styles.card}>
<h3>{"KIT — The building blocks of possibility."}</h3>
<p>{"A kit contains the tools needed to create, build, or accomplish something."}</p>
<p>{"For buyers, Kit represents the ready-made digital resources that can help turn their ideas into action."}</p>
<p>{"For creators, it represents their knowledge, skills, and creations — transformed into useful digital products."}</p>
</article>
<article className={styles.card}>
<h3>{"CART — A marketplace of opportunities."}</h3>
<p>{"A cart brings different things together in one place."}</p>
<p>{"For buyers, it's the freedom to explore and choose the right resources for their next project."}</p>
<p>{"For creators, it's an opportunity to make their digital work discoverable and available to people who can benefit from it."}</p>
</article>
</div><div className={styles.closing}>
<p>{"Together, they form KitCart."}</p>
<p><strong>{"A place where creators share what they’ve built, and others discover what they need to build next."}</strong></p>
</div>
</section>
<section className={styles.section} aria-labelledby="section-40">
  <header className={styles.heading}>
    <h2 id="section-40">{"The Meaning Behind Our Logo"}</h2>
    <p className={styles.subtitle}>{"From a Dot to a Star."}</p>
  </header>
  <p>{"Our logo tells a story through three simple elements."}</p><div className={styles.three}>
<article className={styles.card}>
<h3>{"The Dot — Where everything begins."}</h3>
<p>{"For a buyer, the dot represents a small idea, a dream, or a project waiting to take shape."}</p>
<p>{"For a creator, it represents that first moment of inspiration — the beginning of something they have the skills to build."}</p>
<p>{"Different beginnings. The same potential."}</p>
</article>
<article className={styles.card}>
<h3>{"The Line — The Journey Through KitCart."}</h3>
<p>{"The curved line moves through our name because we want KitCart to be part of the journey."}</p>
<p>{"For buyers, that means discovering the right tools and resources to bring an idea closer to reality."}</p>
<p>{"For creators, it means having a place to showcase their digital products, connect with potential buyers, and explore new opportunities."}</p>
<p>{"The line represents connection, progress, and possibility."}</p>
</article>
<article className={styles.card}>
<h3>{"The Star — What It Could Become."}</h3>
<p>{"The star represents the potential of both journeys."}</p>
<p>{"A buyer's idea can become a real project."}</p>
<p>{"A creator's work can reach someone who needs it."}</p>
<p>{"Something that begins small can become something meaningful."}</p>
</article>
</div><div className={styles.closing}>
<p><strong>{"The dot is the beginning. KitCart is the connection. The star is the possibility."}</strong></p>
<p>{"Because we believe something simple:"}</p>
<blockquote className={styles.quote}>{"Even stars start somewhere."}</blockquote>
</div>
</section>
<section className={styles.section} aria-labelledby="section-60">
  <header className={styles.heading}>
    <h2 id="section-60">{"One Platform. Two Kinds of Possibility."}</h2>
    <p className={styles.subtitle}>{"For the Dreamers. For the Doers."}</p>
  </header>
  <p>{"We believe a great digital marketplace should work for both the people who create and the people who discover."}</p><div className={styles.two}>
<article className={styles.card}>
<h3>{"For Buyers — Turn Ideas Into Action."}</h3>
<p>{"Have an idea but don't know where to begin?"}</p>
<p>{"KitCart aims to make it easier to discover useful digital resources, including website templates, AI prompts, automation workflows, dashboards, designs, code, and much more."}</p>
<p>{"Instead of starting every project from scratch, explore tools that can help you learn, experiment, customize, and build."}</p>
<p>{"Whether you're a student, entrepreneur, professional, developer, or simply someone curious about creating something new, we're here to help you find a starting point."}</p>
<p><strong>{"You bring the idea. Discover the tools to build it."}</strong></p>
</article>
<article className={styles.card}>
<h3>{"For Creators — Your Work Deserves an Audience."}</h3>
<p>{"You've spent hours writing code, designing templates, building automations, developing AI prompts, or creating something useful."}</p>
<p>{"Why should that work have to remain hidden in a folder on your computer?"}</p>
<p>{"We want KitCart to become a place where creators can turn their skills and knowledge into digital products that others can discover and purchase."}</p>
<p>{"A platform where your work is more than just another file."}</p>
<p>{"It's something valuable you've created, and something someone else might be looking for."}</p>
<p>{"Whether you’re an independent developer, designer, AI creator, freelancer, or someone who simply enjoys building useful things, we want to create opportunities for your work to reach the people who need it."}</p>
<p>{"You focus on creating something valuable."}</p>
<p>{"Our ambition is to build a marketplace that helps connect that value with demand."}</p>
<p><strong>{"Because great ideas deserve the right tools. And great creators deserve to be discovered."}</strong></p>
</article>
</div>
</section>
<section className={styles.section} aria-labelledby="section-79">
  <header className={styles.heading}>
    <h2 id="section-79">{"Why Create and Sell on KitCart?"}</h2>
    <p className={styles.subtitle}>{"Build Once. Create New Opportunities."}</p>
  </header>
  <p>{"Your knowledge and creativity can become something more than a one-time project."}</p><div className={styles.benefits}>
<article className={styles.card}>
<h3>{"Give Your Creations a Marketplace"}</h3>
<p>{"Turn useful digital resources into products that potential customers can discover, evaluate, and purchase."}</p>
</article>
<article className={styles.card}>
<h3>{"Reach People Looking for What You Build"}</h3>
<p>{"Whether you've created an automation, website template, dashboard, design resource, or developer tool, KitCart is being built to connect digital products with people searching for practical solutions."}</p>
</article>
<article className={styles.card}>
<h3>{"Create Opportunities to Earn"}</h3>
<p>{"Explore the possibility of monetizing original digital work, rather than limiting its value to personal use or individual client projects. Earnings depend on customer demand and sales."}</p>
</article>
<article className={styles.card}>
<h3>{"Showcase Your Skills"}</h3>
<p>{"Let your products demonstrate what you know and what you can create."}</p>
<p>{"Your work can speak for itself."}</p>
</article>
<article className={styles.card}>
<h3>{"Help Someone Else Get Started"}</h3>
<p>{"A template you've designed could help someone launch their first website."}</p>
<p>{"A workflow you've developed could save a business time."}</p>
<p>{"A prompt you've written could give another creator a starting point."}</p>
</article>
</div><div className={styles.closing}>
<p>{"And that's what makes a digital marketplace powerful."}</p>
<p><strong>{"One person's finished creation can become another person's beginning."}</strong></p>
<p>{"Interested in sharing your creations?"}</p>
<blockquote className={styles.quote}>{"Become a KitCart Creator."}</blockquote>
</div>
</section>
<section className={styles.section} aria-labelledby="section-99">
  <header className={styles.heading}>
    <h2 id="section-99">{"What You'll Find on KitCart"}</h2>
    <p className={styles.subtitle}>{"A Growing World of Digital Possibilities."}</p>
  </header>
  <p>{"We're building KitCart around practical digital resources across areas such as:"}</p><ul className={styles.catalogue}>
<li>{"Website templates and web design resources"}</li>
<li>{"AI prompts and creative assets"}</li>
<li>{"Automation workflows and scripts"}</li>
<li>{"Dashboards and data visualization"}</li>
<li>{"Presentations and professional documents"}</li>
<li>{"Spreadsheets and calculators"}</li>
<li>{"Code and developer resources"}</li>
<li>{"No-code and application templates"}</li>
<li>{"Marketing and social media assets"}</li>
<li>{"Ebooks, guides, and learning resources"}</li></ul><p>{"Our ambition is to bring together useful digital resources created for real projects, practical challenges, and creative possibilities."}</p>
</section>
<section className={styles.section} aria-labelledby="section-113">
  <header className={styles.heading}>
    <h2 id="section-113">{"What We Believe"}</h2>
    <p className={styles.subtitle}>{"Ideas Matter. Creators Matter. Possibilities Matter."}</p>
  </header>
  <div className={styles.beliefs}>
<article className={styles.card}>
<h3>{"Creativity deserves opportunity."}</h3>
<p>{"People who create useful digital resources should have opportunities to share their work and explore its commercial potential."}</p>
</article>
<article className={styles.card}>
<h3>{"Ideas deserve a starting point."}</h3>
<p>{"Not everyone has the time or skills to build everything from scratch. Accessible digital tools can make the first step easier."}</p>
</article>
<article className={styles.card}>
<h3>{"Quality matters more than quantity."}</h3>
<p>{"We want to prioritize useful products, clear descriptions, genuine previews, and transparency about what customers receive."}</p>
</article>
<article className={styles.card}>
<h3>{"Trust works both ways."}</h3>
<p>{"Buyers deserve clarity about what they’re purchasing. Creators deserve understandable expectations about how their products are presented and sold."}</p>
</article>
<article className={styles.card}>
<h3>{"We're building for what's next."}</h3>
<p>{"Our vision goes beyond individual transactions. We want to create a platform where the value of digital creations can continue to grow through new uses, new projects, and new people."}</p>
</article>
</div>
</section>
<section className={styles.section} aria-labelledby="section-125">
  <header className={styles.heading}>
    <h2 id="section-125">{"Meet the People Behind KitCart"}</h2>
    <p className={styles.subtitle}>{"Three Friends. One Shared Vision."}</p>
  </header>
  <div className={styles.three}>
<article className={styles.card}>
<h3>{"Rishabh — Technology"}</h3>
<p>{"Working on the technology and digital infrastructure behind KitCart, with a focus on building and improving the platform experience."}</p>
</article>
<article className={styles.card}>
<h3>{"Garv — Brand & Marketing"}</h3>
<p>{"Working on KitCart's brand identity, marketing, customer discovery, and communication to help the platform connect with both buyers and creators."}</p>
</article>
<article className={styles.card}>
<h3>{"Adit — Finance & Business"}</h3>
<p>{"Working on financial planning, business operations, and commercial strategy to support KitCart's long-term development."}</p>
</article>
</div><div className={styles.closing}>
<p>{"Different responsibilities, one shared ambition:"}</p>
<p><strong>{"To build something that helps other people build something."}</strong></p>
</div>
</section>
<section className={styles.section} aria-labelledby="section-135">
  <header className={styles.heading}>
    <h2 id="section-135">{"Our Vision"}</h2>
    <p className={styles.subtitle}>{"A Marketplace Where Ideas and Creations Meet."}</p>
  </header>
  <div className={styles.story}>
<p>{"We don't want KitCart to be a place where people simply download digital files."}</p>
<p>{"We want it to become an ecosystem of possibilities."}</p>
<p>{"Where a student can discover tools to build their first project."}</p>
<p>{"Where an entrepreneur can find resources to test an idea."}</p>
<p>{"Where a designer can share original templates."}</p>
<p>{"Where a developer can turn a useful piece of code into a digital product."}</p>
<p>{"Where creators and customers can help one another move from possibility to progress."}</p>
<p>{"We're beginning with a simple belief."}</p>
<p><strong>{"The next great idea could come from anywhere. And the tools that help bring it to life could be created by anyone."}</strong></p>
<p>{"Our goal is to help bring those two worlds together."}</p>
</div>
</section>
<section className={styles.final} aria-labelledby="about-starting-point">
  <h2 id="about-starting-point">{"Every Star Has a Starting Point."}</h2>
  <p>{"Maybe you're here because you have an idea."}</p>
<p>{"Maybe you're here because you've already created something worth sharing."}</p>
<p>{"Either way, there's a place for you in the future we're building."}</p>
<p><strong>{"For the ideas waiting to be created."}</strong></p>
<p><strong>{"For the creations waiting to be discovered."}</strong></p>
<p>{"Welcome to KitCart."}</p>
<blockquote className={styles.quote}>{"From a Dot to a Star."}</blockquote>
  <div className={styles.actions}>
    <MarketplaceLink href="/explore" className={styles.primary}>EXPLORE DIGITAL PRODUCTS</MarketplaceLink>
    <span aria-hidden="true" className={styles.divider}>|</span>
    <MarketplaceLink href="/help#creator-onboarding" className={styles.secondary}>BECOME A CREATOR</MarketplaceLink>
  </div>
</section>
    </main>
  );
}
